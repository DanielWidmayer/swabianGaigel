/**
 * GameControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */



module.exports = {
  
    startGame: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error('no socket request'));
        }
        else {
            try {
                let room = await Room.findOne({id: req.session.roomid}).populate('players');
                if (!room) return res.badRequest(new Error('This room could not be found.'));

                // update room status
                await Room.updateOne({id: room.id}).set({status: 'game'});

                // create carddeck and choose trump
                let carddeck = await Card.find();
                let cards = [];
    
                carddeck.forEach((el) => {
                    cards.push(el.id);
                });
                await Room.addToCollection(room.id, 'deck', cards);

                let trump_card = Card.getRandomCard(carddeck);
                await Room.removeFromCollection(room.id, 'deck').members(trump_card.id);
                await Room.updateOne({id: room.id}).set({trump: trump_card.id});

                // player hands
                room.players.forEach(async (el) => {
                    await Card.dealCard(5, el.id, room.id);
                    let p_temp = await User.findOne({id: el.id}).populate('hand');
                    // socket start event
                    sails.sockets.broadcast(el.socket, 'start', {hand: p_temp.hand, trump: trump_card});
                })
                
                room = await Room.findOne({id: room.id}).populate('deck');

                return res.ok();
            } catch (err) {
                return res.serverError(err);
            }
        }
    },

    pauseGame: async (req, res) => {

    },


};

