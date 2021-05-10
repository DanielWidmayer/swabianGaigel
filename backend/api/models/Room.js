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
    },

    trump: {
      model: 'card'
    }

  },

  shuffleDeck: (deck) => {
    let x, y;
    for (i = deck.length - 1; i > 0; i--) {
      x = Math.floor(Math.random() * (i + 1));
      y = deck[i];
      deck[i] = deck[x];
      deck[x] = y;
    }
    return deck;
  }

};

