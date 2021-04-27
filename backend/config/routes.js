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

  '/': { 
    view: 'basic/index',
    locals: {
      layout: 'basic_layout'
    }
  },

  '/list': { 
    view: 'basic/roomlist',
    locals: {
      layout: 'basic_layout'
    }
  },

  '/join/:roomID': 'RoomController.joinUser',

  '/leave': 'RoomController.leaveUser',

  'GET /create': { 
    view: 'basic/create',
    locals: {
      layout: 'basic_layout'
    }
  },

  'POST /create': 'RoomController.newRoom',

  '/room/:roomID': 'RoomController.access',

  '/socketconnect': 'RoomController.socketconnect',

  '/chatpost': 'ChatController.chatpost',

  '/userlist': 'RoomController.userlist',

  '/startGame': 'GameController.startGame'


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
