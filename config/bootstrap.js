/**
 * Seed Function
 * (sails.config.bootstrap)
 *
 * A function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also create a hook.
 *
 * For more information on seeding your app with fake data, check out:
 * https://sailsjs.com/config/bootstrap
 */


module.exports.bootstrap = async function() {

  let values = [0, 2, 3, 4, 10, 11];

  for (deck_ctr = 0; deck_ctr < 2; deck_ctr++) {
    for (let sym = 0; sym < 4; sym++) {
      for (let val of values) {
        await Card.create({
          value: val,
          symbol: sym
        });
      }
    }
  }
  
  // By convention, this is a good place to set up fake data during development.
  //
  // For example:
  // ```
  // // Set up fake development data (or if we already have some, avast)
  // if (await User.count() > 0) {
  //   return;
  // }
  //
  // await User.createEach([
  //   { emailAddress: 'ry@example.com', fullName: 'Ryan Dahl', },
  //   { emailAddress: 'rachael@example.com', fullName: 'Rachael Shaw', },
  //   // etc.
  // ]);
  // ```

};
