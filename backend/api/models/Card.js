/**
 * Card.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */


/* Legende:
  Symbol:
    [0] - Pik / Blatt
    [1] - Karo / Schellen
    [2] - Herz / Herz
    [3] - Kreuz / Eichel
  Value:
    [0]  - 7
    [2]  - Bube / J
    [3]  - Dame / Q
    [4]  - König / K
    [10] - 10
    [11] - Ass
*/

primaryKey: 'id';

module.exports = {

  attributes: {

    id: {
      type: 'number',
      autoIncrement: false,
      unique: true,
      required: true
    }, 

    value: {
      type: 'number',
      required: true
    },

    symbol: {
      type: 'number',
      required: true
    }

  },

  dealCard: async (ammount, userID, roomID) => {
    // TO DO - perform some sanity checks like if room and user exist, max and min ammount of cards
    let cards = [];
    let carddeck = await Room.findOne({id: roomID}).populate('deck');
    carddeck = carddeck.deck;
    
    for (x = 0; x < ammount; x++) {
        cards.push(sails.models.card.getRandomCard(carddeck).id);
    }
    sails.log(cards);
    await User.addToCollection(userID, 'hand', cards);
    await Room.removeFromCollection(roomID, 'deck', cards);
    return 1;
  },

  getRandomCard: (carddeck) => {
    return carddeck[Math.floor(Math.random() * carddeck.length)];
  }

};

