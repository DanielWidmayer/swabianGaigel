/**
 * UserController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


module.exports = {

    accessList: async (req, res) => {
        try {
            let user;
            // check if user is authenticated
            if (req.session.userid) user = await User.findOne({id: req.session.userid});
            // else create User and validate
            else {
                user = await User.newUser(req.cookies.username, res);
                req.session.userid = user.id;
            }
    
            return res.view('basic/roomlist', {layout: 'basic_layout', username: user.name, userhash: user.hashID});
        } catch (err) {
            return res.serverError(err);
        }
    },

    changeName: async (req, res) => {
        let uname = req.body.uname;
        try {
            // check if user is authenticated
            if (!req.session.userid) throw("Authentication Error!");

            // perform some sanity checks on new user name
            if (uname.length == 0 || uname.length > 25) throw("Invalid Username!");

            // update User
            await User.updateOne({id: req.session.userid}).set({name: uname});
            res.cookie('username', uname);
        
            return res.redirect('/list');
        } catch (err) {
            return res.serverError(err);
        }
    }

};

