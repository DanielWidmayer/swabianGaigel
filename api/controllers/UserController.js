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
            let re = /^[a-zA-Z](\s?[a-zA-Z]+)+$/;
            // perform some sanity checks on new user name
            if (uname.length <= 3 || uname.length > 21) throw error(103, "Provide a name with 4-20 characters.");
            else if (!re.test(uname)) throw error(103, "Usernames may only contain letters and single spaces, please try again");
            // update cookie
            res.cookie("username", uname);

            return res.ok();
        } catch (err) {
            if (err.code) {
                return res.status(400).json(err.msg);
            } else return res.serverError(err);
        }
    },
};
