/**
 * Card.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

/* Legende:
  
*/

module.exports = {

  attributes: {

    value: {
      type: 'number',
      required: true
    },

    symbol: {
      type: 'number',
      required: true
    }

  },

};

