/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {
    /***************************************************************************
     *                                                                          *
     * Make the view located at `views/homepage.ejs` your home page.            *
     *                                                                          *
     * (Alternatively, remove this and add an `index.html` file in your         *
     * `assets` directory)                                                      *
     *                                                                          *
     ***************************************************************************/

    "/": {
        view: "basic/index",
        locals: {
            layout: "index_layout",
        },
    },

    "/list": "RoomController.accessList",

    "/roomList": "RoomController.roomList",

    "POST /protect": "RoomController.protectRoom",

    "POST /username": "UserController.changeName",

    "/leave": "RoomController.leaveUser",

    "GET /create": "RoomController.createPage",

    "POST /create": "RoomController.newRoom",

    "/join/:roomID": "RoomController.joinRoom",

    "/room/:roomID": "RoomController.roomAccess",

    "/socketconnect": "RoomController.socketconnect",

    "/chatpost": "ChatController.chatpost",

    "/startGame": "GameController.startGame",

    "/randomOrder": "GameController.randomOrder",

    "/switchTeam": "GameController.switchTeam",

    "/addBot": "GameController.addBot",

    "/kickPlayer": "GameController.kickPlayer",

    "/playCard": "GameController.playCard",

    "/callPair": "GameController.callPair",

    "/robTrump": "GameController.robTrump",

    "/unloadUser": "RoomController.unloadUser",

    /***************************************************************************
     *                                                                          *
     * More custom routes here...                                               *
     * (See https://sailsjs.com/config/routes for examples.)                    *
     *                                                                          *
     * If a request to a URL doesn't match any of the routes in this file, it   *
     * is matched against "shadow routes" (e.g. blueprint routes).  If it does  *
     * not match any of those, it is matched against static assets.             *
     *                                                                          *
     ***************************************************************************/
};
