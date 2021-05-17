/**
 * Room.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */



module.exports = {

  attributes: {

    hashID: {
      type: 'string',
      required: true
    },

    name: {
      type: 'string',
      required: true
    },

    // status: game, lobby
    status: {
      type: 'string',
      defaultsTo: 'lobby'
    },

    password: {
      type: 'string',
      encrypt: true
    },

    maxplayers: {
      type: 'number',
      defaultsTo: 4
    },

    admin: {
      model: 'user'
    },

    /*
      jsonplayers: [
        { 
          playerID: User.id ,
          hand: [ Card.id ],
          score: Integer,
          ready: true/false
        }
      ]
    */
    jsonplayers: {
      type: 'json'
    },

    activePlayer: {
      type: 'number',
      defaultsTo: 0
    },

    deck: {
      collection: 'card'
    },

    trump: {
      model: 'card'
    },

    /*
      stack: [
        { playerID: Integer, card: Card }
      ]
    */
    stack: {
      type: 'json'
    }

  },

  getListRoom: async (ident) => {
    let room;
    try {
      if (ident.id) room = await Room.findOne({ id: ident.id });
      else if (ident.hash) room = await Room.findOne({ hashID: ident.hash });
      if (room) {
        return { hashID: room.hashID, name: room.name, password: room.password ? true : false, maxplayers: room.maxplayers, players: room.jsonplayers.length };
      } else {
        return null;
      }
    } catch (err) {
      sails.log(err);
    }
  }

};

