const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
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

let fieldCount = 0;
const encryptRAW = function(object, publicFields) {                                                           //encryption function

    let temp = Object.entries(object);

    temp.forEach(element => {                                                                           //forEach key-value pair

        if (typeof element[1] === "object" && !Array.isArray(element[1])) {                             //if the value is an object
            element[1] = encryptRAW(element[1], publicFields);

        } else if (typeof element[1] === "object" && Array.isArray(element[1])) {                       //if it's an array

            for (let i = 0; i<element[1].length; i++) {                                                 //cycle through and encrypt each object in the array
                element[1][i] = encryptRAW(element[1][i], publicFields);
            }
        } else {                                                                                        // if it's of a different type

            publicFields.forEach(field => {
                if (element[0] === field) {
                    generateKeys();
                    publicArray[fieldCount].push(field);
                    privateArray[fieldCount].push(field);
                    fieldCount++;
                    element[1] = encryptStringWithRsaPublicKey(`${element[1]}`, publicArray.length - 1);
                }
            });
        }
    });

    temp = Object.fromEntries(temp);                                                                    //transform the array back into a normal object
    return temp;
}

const reencryptRAW = function(object, publicFields) {                                                           //encryption function

    let temp = Object.entries(object);

    temp.forEach(element => {                                                                           //forEach key-value pair

        if (typeof element[1] === "object" && !Array.isArray(element[1])) {                             //if the value is an object
            element[1] = reencryptRAW(element[1], publicFields);

        } else if (typeof element[1] === "object" && Array.isArray(element[1])) {                       //if it's an array

            for (let i = 0; i<element[1].length; i++) {                                                 //cycle through and encrypt each object in the array
                element[1][i] = reencryptRAW(element[1][i], publicFields);
            }
        } else {                                                                                        // if it's of a different type

            publicFields.forEach(field => {
                if (element[0] === field) {
                    element[1] = encryptStringWithRsaPublicKey(`${element[1]}`, counter);
                    counter++
                }
            });
        }
    });

    temp = Object.fromEntries(temp);                                                                    //transform the array back into a normal object
    return temp;
}


let counter = 0;
const decryptRAW = function(object, publicFields) {                                                           //Decryption function

    let temp = Object.entries(object);

    temp.forEach(element => {                                                                           //forEach key-value pair

        if (typeof element[1] === "object" && !Array.isArray(element[1])) {                             //if the value is an object
            element[1] = decryptRAW(element[1], publicFields);

        } else if (typeof element[1] === "object" && Array.isArray(element[1])) {                       //if it's an array

            for (let i = 0; i<element[1].length; i++) {                                                 //cycle through and encrypt each object in the array
                element[1][i] = decryptRAW(element[1][i], publicFields);
            }
        } else {                                                                                        // if it's of a different type

            publicFields.forEach(field => {
                if (element[0] === field) {
                    console.log(decryptStringWithRsaPrivateKey(`${element[1]}`, counter));
                    element[1] = decryptStringWithRsaPrivateKey(`${element[1]}`, counter);
                    counter++;
                }
            });
        }
    });

    temp = Object.fromEntries(temp);                                                                     //transform the array back into a normal object
    return temp;
}


function makeDecryptionAndReencryptionFile(privateJSONPath, publicJSONPath, publicFieldsArray) {

    privateArray = [];                                                                                //setup for making the Decryption.json file
    const absolutePathPrivate = path.resolve(privateJSONPath);
    const privateJSON = require(absolutePathPrivate);

    privateJSON.forEach((pair)=>{                                                                           //forEach key-field pair

        publicFieldsArray.forEach((field)=>{                                                                //forEach field in the publicFieldsArray for the file

            if (pair[1] === field) {                                                                        //if fields match up: push the pair to the new file
                privateArray.push(pair);
            }
        });
    });
    writeFileSync('decryptionFile.json', JSON.stringify(privateArray));


    const absolutePathPublic = path.resolve(publicJSONPath);                                                //setup for making the Re-encryption.json file
    const publicJSON = require(absolutePathPublic);
    publicArray = [];

    publicJSON.forEach((pair)=>{                                                                            //forEach key-field pair

        publicFieldsArray.forEach((field)=>{                                                                //forEach field in the publicFieldsArray for the file

            if (pair[1] === field) {                                                                        //if fields match up: push the pair to the new file
                publicArray.push(pair);
            }
        });
    });
    writeFileSync('reencryptionFile.json', JSON.stringify(publicArray));
    writeFileSync('fields.json', JSON.stringify(publicFieldsArray));
};

function encrypt (JSONToEncryptPath, publicFieldsFilePath) {
    fieldCount = 0;
    publicArray = [];
    privateArray = [];
    const JSONToEncrypt = require(path.resolve(JSONToEncryptPath));
    const publicFields = require(path.resolve(publicFieldsFilePath));
    const encrypted = encryptRAW (JSONToEncrypt, publicFields);
    writeFileSync('inputEncrypted.json', JSON.stringify(encrypted));
    writeFileSync('public.json', JSON.stringify(publicArray));
    writeFileSync('private.json', JSON.stringify(privateArray));
    return encrypted;
}

function decrypt (JSONToDecryptPath, publicFieldsFilePath, decryptionFilePath) {
    counter = 0;
    const decryptionFile = require(path.resolve(decryptionFilePath));
    privateArray = decryptionFile;
    const JSONToDecrypt = require(path.resolve(JSONToDecryptPath));
    const publicFields = require(path.resolve(publicFieldsFilePath));
    decryptedData = decryptRAW (JSONToDecrypt, publicFields);
    writeFileSync('data.json', JSON.stringify(decryptedData));
}

function reencrypt (JSONToEncryptPath, publicFieldsFilePath, reencryptionFilePath) {
    counter = 0;
    publicArray = require(path.resolve(reencryptionFilePath));
    const JSONToEncrypt = require(path.resolve(JSONToEncryptPath));
    const publicFields = require(path.resolve(publicFieldsFilePath));
    const reencrypted = reencryptRAW (JSONToEncrypt, publicFields);
    writeFileSync('inputReencrypted.json', JSON.stringify(reencrypted));
    return reencrypted;
}









encrypt('input.json', 'publicFields.json');
makeDecryptionAndReencryptionFile('private.json', 'public.json', ["type", "name"]);
decrypt('inputEncrypted.json', 'fields.json', 'decryptionFile.json');
reencrypt('data.json', 'fields.json', 'reencryptionFile.json');





