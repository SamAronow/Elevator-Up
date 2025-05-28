
const firebaseConfig = {
  apiKey: "AIzaSyAJFgl-hgLcFPpxT2FDAT-7zwFzF_Wcrks",
  authDomain: "elevate-981d7.firebaseapp.com",
  projectId: "elevate-981d7",
  storageBucket: "elevate-981d7.firebasestorage.app",
  messagingSenderId: "1064371632094",
  appId: "1:1064371632094:web:fed3d92cd90655a62d0f4f",
  measurementId: "G-9B0BT7T7H9"
};

  firebase.initializeApp(firebaseConfig);
var database = firebase.database();

function write(path, value){
    return database.ref(path).set(value);
  }
  

function read(path) {
return database.ref(path).once('value')
  .then(function(snapshot) {
    //console.log(snapshot.val());
    return snapshot.val();
  })
  .catch(function(error) {
    console.error("Error reading Data:", error);
  });
}

function removeNode(path){
database.ref(path).remove()
.then(() => {
console.log("Node deleted successfully!");
})
.catch((error) => {
console.error("Error deleting node:", error);
});
}

