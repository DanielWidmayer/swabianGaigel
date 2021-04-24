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

    players: {
      collection: 'user'
    },

    deck: {
      collection: 'card'
    }

  },

};

