const { db } = require('../util/admin')

exports.getAllScreams = (request, response) => {
  db.collection('screams')
  .orderBy('createdAt','desc')
  .get()
  .then(data => {
    let screams = []
    data.forEach(doc => {
      screams.push({
        ...doc.data()
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
    createdAt: new Date().toISOString()
  }
  db.collection('screams').add(newScream)
  .then(doc => {
    response.json({ message: `document ${doc.id} created successfully`})
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
    return res.status(400).json({error: 'Must not be empty!'})
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

// exports.commentOnScream = (req, res) => {	
//   if (req.body.body.trim() === '')	
//     return res.status(400).json({ comment: 'Must not be empty' });	
//   const newComment = {	
//     body: req.body.body,	
//     createdAt: new Date().toISOString(),	
//     screamId: req.params.screamId,	
//     userHandle: req.user.handle,	
//     userImage: req.user.imageUrl	
//   };	
//   console.log(newComment);	
//   db.doc(`/screams/${req.params.screamId}`)	
//     .get()	
//     .then((doc) => {	
//       if (!doc.exists) {	
//         return res.status(404).json({ error: 'Scream not found' });	
//       }	
//       return doc.ref.update({ commentCount: doc.data().commentCount + 1 });	
//     })	
//     .then(() => {	
//       return db.collection('comments').add(newComment);	
//     })	
//     .then(() => {	
//       res.json(newComment);	
//     })	
//     .catch((err) => {	
//       console.log(err);	
//       res.status(500).json({ error: 'Something went wrong' });	
//     });	
// };