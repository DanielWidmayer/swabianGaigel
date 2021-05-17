module.exports = {

  friendlyName: 'Errors',

  description: 'Errors something.',

  sync: true,

  inputs: {
    code: {
      type: "number",
      description: "The Error Code defining the Type of Error that should be thrown.",
      required: true
    },
    msg : {
      type: "string",
      description: "The Error message declaring what happened."
    }
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },


  fn: function (inputs, exits) {
    let err = new Error(inputs.msg);

    switch(inputs.code) {
      case 101: 
        err.name = "Authentication Error";
        err.code = 101;
        break;
      case 102:
        err.name = "Room Error";
        err.code = 102;
        break;
      case 103:
        err.name = "Invalid Data";
        err.code = 103;
        break;
      case 104:
        err.name = "Game Error";
        err.code = 104;
        break;
      default:
        err.name = "Undefined Error";
        err.code = 105;
        break;
    }

    return exits.success(err);
  }


};

