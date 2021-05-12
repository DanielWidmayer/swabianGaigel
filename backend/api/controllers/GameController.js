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
                //let room = await Room.findOne({id: req.session.roomid}).populate('players');
                let room = await Room.findOne({id: req.session.roomid});
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

                /* create order-object
                let order = [];
                for (el of room.players) {
                    order.push({uHASH: el.hashID, uNAME: el.name, uCARDS: 5, uSCORE: 0});
                }
                // shuffle for random order
                for (let i = order.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [order[i], order[j]] = [order[j], order[i]];
                }
                // save order
                await Room.updateOne({id: room.id}).set({order: order});
                */
                let players = room.jsonplayers;
                let j,m;
                for (i = players.length - 1; i > 0; i--) {
                    j = Math.floor(Math.random() * (i + 1));
                    m = players[i];
                    players[i] = players[j];
                    players[j] = m;
                }

                // deal cards to players, start game
                /*for (el of room.players) {
                    await Card.dealCard(5, el.id, room.id);
                    let p_temp = await User.findOne({id: el.id}).populate('hand');
                    // socket start event
                    sails.sockets.broadcast(el.socket, 'start', {hand: p_temp.hand, trump: trump_card, order: order, active: room.activePlayer});
                }*/
                for (el of room.jsonplayers) {
                    let hand = await Card.dealCard(5, el.playerID, room.id);
                    sails.log(hand);
                    let pl = await User.findOne({id: el.playerID});
                    sails.sockets.broadcast(pl.socket, 'start', {hand: hand, trump: trump_card, active: 0});
                }
                
                // broadcast turn event
                //sails.sockets.broadcast(room.hashID, 'turn', {uNAME: order[0].uNAME, uHASH: order[0].uHASH});

                return res.ok();
            } catch (err) {
                return res.serverError(err);
            }
        }
    },

    playCard: async(req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error('no socket request'));
        }

        try {
            let room, user, card, players_c;
            let pass = false;

            // check if room exists
            //if (req.session.roomid) room = await Room.findOne({id: req.session.roomid}).populate('players');
            if (req.session.roomid) room = await Room.findOne({id: req.session.roomid});
            else throw(new Error('Authentication Error!'));
            if (!room) throw(new Error('This room could not be found.'));

            // check if user exists
            //if (req.session.userid) user = await User.findOne({id: req.session.userid}).populate('hand');
            if (req.session.userid) user = await User.findOne({id: req.session.userid});
            else throw(new Error('Authentication Error!'));
            if (!user) throw(new Error('This user could not be found.'));

            // check if user is in room
            /*room.players.forEach((el) => {
                if (el.id == user.id) pass = true;
            });
            if (!pass) throw(new Error('User is not in this room.'));
            pass = false;*/
            if (!room.jsonplayers.find(el => el.playerID == userid)) throw(new Error('User is not in this room.'));

            // check if user is active player
            if (user.hashID != room.order[room.activePlayer].uHASH) throw(new Error('This is not your turn, cheater!'));

            // check if user owns card
            card = req.body.card;
            user.hand.forEach((el) => {
                if (el.id == card.id) pass = true;
            });
            if (!pass) throw(new Error('You do not own this card, cheater!'));
            pass = false;

            // add card to stack and remove from hand
            await Room.addToCollection(room.id, 'stack').members(card.id);
            await User.removeFromCollection(user.id, 'hand').members(card.id);

            // check for full stack
            players_c = room.players.length;
            room = await Room.findOne({id: room.id}).populate('stack');
            if (room.stack.length >= players_c) {
                // eval win
            }



            // socket event cardplayed
            sails.sockets.broadcast(room.hashID, 'cardplayed', { data: pass }, req);

            return res.ok();
        } catch (err) {
            return res.serverError(err);
        }
    },

    pauseGame: async (req, res) => {

    },


};

