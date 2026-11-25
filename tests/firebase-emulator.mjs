import assert from "node:assert/strict";
import {initializeApp,deleteApp} from "firebase/app";
import {connectAuthEmulator,getAuth,createUserWithEmailAndPassword} from "firebase/auth";
import {connectFirestoreEmulator,getFirestore,doc,getDoc,setDoc,serverTimestamp} from "firebase/firestore";
import {connectStorageEmulator,getStorage,ref,uploadBytes,getBytes} from "firebase/storage";
const projectId="demo-local-resolve";
async function client(name){
 const app=initializeApp({projectId,apiKey:"emulator-only",storageBucket:projectId+".appspot.com"},name);
 const auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
 connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});connectFirestoreEmulator(db,"127.0.0.1",8181);connectStorageEmulator(storage,"127.0.0.1",9199);
 const {user}=await createUserWithEmailAndPassword(auth,name+Date.now()+"@example.test","demo-test-password");
 return {app,db,storage,id:user.uid};
}
const a=await client("owner"),b=await client("other");
try{
 const path="privateWorkspaces/"+a.id,media="workspaceMedia/"+a.id+"/evidence";
 await setDoc(doc(a.db,path),{payload:"{}",revision:1,updatedAt:serverTimestamp()});
 assert.equal((await getDoc(doc(a.db,path))).data().revision,1);
 await assert.rejects(getDoc(doc(b.db,path)),{code:"permission-denied"});
 await assert.rejects(setDoc(doc(a.db,path),{payload:"{}",revision:4,updatedAt:serverTimestamp()}),{code:"permission-denied"});
 await uploadBytes(ref(a.storage,media),Uint8Array.of(1,2),{contentType:"image/png"});
 assert.equal((await getBytes(ref(a.storage,media))).byteLength,2);
 await assert.rejects(getBytes(ref(b.storage,media)),{code:"storage/unauthorized"});
 console.log("Owner persistence, revision checks, evidence and account isolation passed.");
}finally{await Promise.all([deleteApp(a.app),deleteApp(b.app)])}
