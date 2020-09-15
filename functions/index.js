const functions = require('firebase-functions')

const app = require('express')()

const { getAllScreams, postOneScream, getScream, commentOnScream, likeScream, unlikeScream } = require('./handlers/screams')
const { signup, login, uploadImage, addUserDetails, getAuthenticatedUser } = require('./handlers/users')
const FBAuth = require('./util/fbauth')


// Scream routes
app.get('*/screams/get', getAllScreams)
app.post('/scream', FBAuth, postOneScream)
app.get('*/scream/:screamId', getScream)

// TODO:
// delete scream
// like a scream
// unlike a scream
app.get('*/scream/:screamId/like', FBAuth, likeScream)
app.get('*/scream/:screamId/unlike', FBAuth, unlikeScream)
app.post('*/scream/:screamId/comment', FBAuth, commentOnScream)


// User routes
app.post('/signup', signup)
app.post('/login', login)
app.post('*/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)


exports.api = functions.region('europe-west1').https.onRequest(app); 