const crypto = require("crypto");
const path = require("path");
const  fs = require("fs");
let publicArray=[];
let privateArray=[];
const passphrase = "mySecret";

const encryptStringWithRsaPublicKey = function(toEncrypt, positionInPublicArray) {
    let publicKey = publicArray[positionInPublicArray][0];
    let buffer = Buffer.from(toEncrypt);
    let encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString("base64");
};

const decryptStringWithRsaPrivateKey = function(toDecrypt, positionInPrivateArray) {
    let privateKey = privateArray[positionInPrivateArray][0];
    let buffer = Buffer.from(toDecrypt, "base64");
    const decrypted = crypto.privateDecrypt(
        {
            key: privateKey,
            passphrase: passphrase,
        },
        buffer,
    )
    return decrypted.toString("utf8");
};

const { writeFileSync } = require('fs')
const { generateKeyPairSync } = require('crypto')

function generateKeys() {
    const { publicKey, privateKey } = generateKeyPairSync('rsa',
    {
            modulusLength: 4096,
            namedCurve: 'secp256k1',
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
                cipher: 'aes-256-cbc',
                passphrase: passphrase
            }
    });
    publicArray.push([publicKey]);
    privateArray.push([privateKey]);
}

const data = require("./input.json");
const publicFields = require("./publicFields.json");

let fieldCount = 0;

const encrypt = function(object) {                                              //encryption function
  let temp = Object.entries(object);

  temp.forEach(element => {                                                     //forEach key-value pair

    if (typeof element[1] === "object" && !Array.isArray(element[1])) {         //if the value is an object
      element[1] = encrypt(element[1]);

    } else if (typeof element[1] === "object" && Array.isArray(element[1])) {   //if it's an array

      for (let i = 0; i<element[1].length; i++) {                               //cycle through and encrypt each object in the array
        element[1][i] = encrypt(element[1][i]);
      }
    } else {                                                                    // if it's of a different type

      publicFields.forEach(field => {
        if (element[0] === field) {
          generateKeys();
          publicArray[fieldCount].push(field);
          fieldCount++;
          element[1] = encryptStringWithRsaPublicKey(`${element[1]}`, publicArray.length - 1);
        }
      });
    }
  });

  temp = Object.fromEntries(temp);                                              //transform the array back into a normal object
  return temp;
}


let counter = 0;
const decrypt = function(object) {                                              //Decryption function
  let temp = Object.entries(object);
  temp.forEach(element => {                                                     //forEach key-value pair

    if (typeof element[1] === "object" && !Array.isArray(element[1])) {         //if the value is an object
      element[1] = decrypt(element[1]);

    } else if (typeof element[1] === "object" && Array.isArray(element[1])) {   //if it's an array

      for (let i = 0; i<element[1].length; i++) {                               //cycle through and encrypt each object in the array
        element[1][i] = decrypt(element[1][i]);
      }
    } else {                                                                    // if it's of a different type

      publicFields.forEach(field => {
        if (element[0] === field) {
            console.log(decryptStringWithRsaPrivateKey(`${element[1]}`, counter));
            element[1] = decryptStringWithRsaPrivateKey(`${element[1]}`, counter);
            counter++;
        }
      });
    }
  });

  temp = Object.fromEntries(temp);                                              //transform the array back into a normal object
  return temp;
}

function makeDecryptionFile(privateArray, publicFieldsArray) {
    let keyFile = [];
    privateArray.forEach((pair)=>{
        publicFieldsArray.forEach((field)=>{
            if (pair[1] === field) {
                keyFile.push(pair);
            }
        });
    });
    writeFileSync('DecryptionFile.json', JSON.stringify(keyFile));
};







let encryptedData = encrypt(data);
writeFileSync('inputEncrypted.json', JSON.stringify(encryptedData));
let decryptedData = decrypt(encryptedData);
writeFileSync('data.json', JSON.stringify(decryptedData));

writeFileSync('Public.json', JSON.stringify(publicArray));
writeFileSync('Private.json', JSON.stringify(privateArray));
