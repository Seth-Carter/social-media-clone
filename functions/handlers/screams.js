const { db } = require('../util/admin')

exports.getAllScreams = (request, response) => {
  db.collection('screams')
  .orderBy('createdAt','desc')
  .get()
  .then(data => {
    let screams = []
    data.forEach(doc => {
      screams.push({
        ...doc.data(),
        screamId: doc.id
      })
    })
    return response.json(screams)
  })
  .catch(err => console.error(err))
}

exports.postOneScream = (request, response) => {
  if (request.body.body.trim() === '') {
    return response.status(400).json({ body: 'Body must not be empty!'})
  }

  const newScream = {
    body: request.body.body,
    userHandle: request.user.handle,
    userImage: request.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  }

  db.collection('screams').add(newScream)
  .then(doc => {
    const resScream = newScream
    resScream.screamId = doc.id
    response.json(resScream)
  })
  .catch(err => {
    response.status(500).json({ error: 'Something went wrong :('})
    console.error(err)
  })
}

exports.getScream = (req, res) => {
  let screamData = {}
  db.doc(`/screams/${req.params.screamId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({error: 'Scream not found!'})
      }
      screamData = doc.data()
      screamData.screamId = doc.id
      return db.collection('comments').orderBy('createdAt', 'desc').where('screamId', '==', req.params.screamId).get()
    })
    .then(data => {
      screamData.comments = []
      data.forEach(doc => {
        screamData.comments.push(doc.data())
      })
      return res.json(screamData)
    })
    .catch(err => {
      console.error(err)
      return res.status(500).json({error: err.code})
    })
}

exports.commentOnScream = (req, res) => {
  if(req.body.body.trim() === '') {
    return res.status(400).json({ comment: 'Must not be empty!'})
  }
  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    screamId: req.params.screamId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  }
  db.doc(`/screams/${req.params.screamId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({error: 'Scream not found'})
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1})
    })
    .then(() => {
      return db.collection('comments').add(newComment)
    })
    .then(() => {
      return res.json(newComment)
    })
    .catch(err => {
      console.error(err)
      return res.status(500).json({error: 'Something went wrong'})
    })
}

exports.likeScream = (req, res) => {
  // The 'like' document we want to work with
  const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId).limit(1)
  
  // The 'scream' document where we want to add to the like count
  const screamDocument = db.doc(`/screams/${req.params.screamId}`)

  // This is just a holding variable for the data we're pulling out of the database 
  // We  initialize this here so it's available in all the scopes below
  let screamData

  // Let's check to see if there actually is a 'scream' document before we allow users to like it
  screamDocument.get()
    .then(doc => {
      if(doc.exists){
        // If the scream exists, let's copy its data into our holding variable
        screamData = doc.data()
        // We're just adding this extra key value pair so we can see it in the response at the end
        screamData.screamId = doc.id
        // This returns a promise and moves into the next '.then()' with the 'like' document as the response
        return likeDocument.get()
      } else {
        // This terminates the promise chain and returns and error if the scream isn't found
        res.status(404).json({error: 'Scream not found'})
      }
    })
    .then(data => {
      if(data.empty){
        // If the like document is empty, we'll add one
        // The .add() method will automatically create a document ID for documents it creates
        return db.collection('likes').add({
          // This object has the exact same datashape that we defined within firestore
          screamId: req.params.screamId,
          userHandle: req.user.handle,
          createdAt: new Date().toISOString()
        })
        .then(() => {
          // After we make a new 'like' document, let's add a like count to the associated scream that was liked
          screamData.likeCount ++
          return screamDocument.update({ likeCount: screamData.likeCount })
        })
        .then(() => {
          // Then we output the response of this route 
          return res.json(screamData)
        })
      } else {
        // If the data wasn't empty, that means the a like already exists for the given scream
        return res.status(400).json({error: 'Scream already liked'})
      }
    })
    .catch(err => {
      console.error(err)
      res.status(500).json({error: err.code})
    })
}

exports.unlikeScream = (req, res) => {
  const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId).limit(1)
  
  const screamDocument = db.doc(`/screams/${req.params.screamId}`)

  let screamData

  screamDocument.get()
    .then(doc => {
      if(doc.exists){
        screamData = doc.data()
        screamData.screamId = doc.id
        return likeDocument.get()
      } else {
        res.status(404).json({error: 'Scream not found'})
      }
    })
    .then(data => {
      if(data.empty){
        return res.status(400).json({error: 'Scream already liked'})
      } else {
        return db.doc(`/likes/${data.docs[0].id}`).delete()
          .then(() => {
            screamData.likeCount --
            return screamDocument.update({ likeCount: screamData.likeCount })
          })
          .then(() => {
            return res.json(screamData)
          })
      }
    })
    .catch(err => {
      console.error(err)
      res.status(500).json({error: err.code})
    })
}

exports.deleteScream = (req, res) => {
  const document = db.doc(`/screams/${req.params.screamId}`)
  document.get()
    .then(doc => {
      if(!doc.exists) {
        return res.status(404).json({error: 'Scream not found'})
      }
      if(doc.data().userHandle !== req.user.handle){
        return res.status(403).json({error: 'Unauthorized'})
      } else {
        return document.delete()
      }
    })
    .then(() => {
      res.json({message: 'Scream deleted successfully'})
    })
    .catch(err => {
      console.error(err)
      return res.status(500).json({error: err.code})
    })
}