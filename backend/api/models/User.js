/**
 * User.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */


module.exports = {

  attributes: {

    hashID: {
      type: 'number',
      required: true,
      unique: true
    },

    name: {
      type: 'string',
      required: true
    },

    inroom: {
      model: 'room'
    },

    hand: {
      collection: 'card'
    },

    score: {
      type: 'number',
      defaultsTo: 0
    }
    
  },

  newUser: async (c_username) => {
    let hash = 0;
    let name = "";
    // generate unique hash
    do {
      hash = Math.floor(Math.random() * (999 - 100) + 100)
    } while (await User.findOne({hashID: hash}));

    // check for username cookie
    if (c_username) name = c_username
    else name = "User"

    // create User
    await User.create({
      hashID: hash,
      name: name
    });

    let user = await User.findOne({hashID: hash});

    return user;
  }
};

