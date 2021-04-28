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
                carddeck = Room.shuffleDeck(carddeck);
                carddeck.forEach(async (el) => {
                    await Room.addToCollection(room.id, 'deck').members(el.id);
                })
                let trump_card = await Card.getRandomCard(carddeck);
                await Room.removeFromCollection(room.id, 'deck').members(trump_card.id);
                await Room.updateOne({id: room.id}).set({trump: trump_card.id});

                // player hands
                let players = [];
                room.players.forEach(async (el) => {
                    await Card.dealCard(5, el.id, room.id);
                    let p_temp = await User.findOne({id: el.id}).populate('hand');
                    players.push(p_temp);
                })
                
                room = await Room.findOne({id: room.id}).populate('deck');
                // socket start event
                sails.sockets.broadcast(room.hashID, 'start', {players: players, deck: room.deck, trump: trump_card});

                return res.ok();
            } catch (err) {
                return res.serverError(err);
            }
        }
    },

    pauseGame: async (req, res) => {

    },


};

