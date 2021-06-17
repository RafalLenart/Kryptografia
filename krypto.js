var crypto = require("crypto");
var path = require("path");
var fs = require("fs");
const passphrase = "mySecret"

var encryptStringWithRsaPublicKey = function(toEncrypt, relativeOrAbsolutePathToPublicKey) {
    var absolutePath = path.resolve(relativeOrAbsolutePathToPublicKey);
    var publicKey = fs.readFileSync(absolutePath, "utf8");
    var buffer = Buffer.from(toEncrypt);
    var encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString("base64");
};

var decryptStringWithRsaPrivateKey = function(toDecrypt, relativeOrAbsolutePathtoPrivateKey) {
    var absolutePath = path.resolve(relativeOrAbsolutePathtoPrivateKey);
    var privateKey = fs.readFileSync(absolutePath, "utf8");
    var buffer = Buffer.from(toDecrypt, "base64");
    const decrypted = crypto.privateDecrypt(
        {
            key: privateKey.toString(),
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

    writeFileSync('private.pem', privateKey)
    writeFileSync('public.pem', publicKey)
}

generateKeys();

const data = require("./input.json");
const publicFields = require("./publicFields.json");

const encrypt = function(object) {
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
          element[1] = encryptStringWithRsaPublicKey(`${element[1]}`, 'public.pem');
        }
      });
    }
  });

  temp = Object.fromEntries(temp);                                              //transform the array back into a normal object
  return temp;
}

let encryptedData = encrypt(data);
writeFileSync('inputEncrypted.json', JSON.stringify(encryptedData));
