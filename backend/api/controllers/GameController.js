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
                carddeck.forEach(async (el) => {
                    await Room.addToCollection(room.id, 'deck').members(el.id);
                })
                let trump_card = Card.getRandomCard(room.id);
                await Room.removeFromCollection(room.id, 'deck').members(trump_card.id);
                await Room.updateOne({id: room.id}).set({trump: trump_card.id});

                // player hands
                room.players.forEach(async (el) => {
                    await Card.dealCard(5, el.id, room.id);
                })

                // socket start event
                sails.sockets.broadcast(room.hashID, 'start');

                return res.ok();
            } catch (err) {
                return res.serverError(err);
            }
        }
    },

    pauseGame: async (req, res) => {

    },


};

