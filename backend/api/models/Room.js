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

    players: {
      collection: 'user'
    },

    /*
      jsonplayers: [
        { 
          playerID: User.id ,
          hand: [ Card.id ],
          score: Integer
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

  }

};

