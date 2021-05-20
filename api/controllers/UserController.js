/**
 * UserController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const error = sails.helpers.errors;

module.exports = {

    changeName: (req, res) => {
        try {
            let uname = req.body.uname;

            // perform some sanity checks on new user name
            if (uname.length == 0 || uname.length > 20) throw error(103, "Your new username was invalid, please try again!");

            // update cookie
            res.cookie('username', uname);
        
            return res.redirect('/list');
        } catch (err) {
            if (err.code) {
                res.cookie("errmsg", err.message);
                return res.redirect("/list");
            }
            else return res.serverError(err);
        }
    }

};

