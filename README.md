<!-- PROJECT GAIGEL -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]



<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/DanielWidmayer/swabianGaigel">
    <img src="assets/images/headLogo.png" alt="Logo" height="200" width="450">
  </a>

  <h3 align="center">Gaigel Webapp</h3>

  <p align="center">
    An awesome way to play Gaigel with your friends online, for free & without registration!
    <br />
    <br />
    <a href="https://www.gaigel.club">Play Now</a>
    ·
    <a href="https://github.com/DanielWidmayer/swabianGaigel/issues">Report Bug</a>
    ·
    <a href="https://github.com/DanielWidmayer/swabianGaigel/pulls">Request Feature</a>
  </p>
</p>



<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Deployment</a></li>
      </ul>
    </li>
    <li><a href="#usage">How to play</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgements">Acknowledgements</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

[![Product Name Screen Shot][product-screenshot]](https://example.com)

Gaigel is a traditionally swabian card game. However there is no website to play Gaigel online with your friends. This project implements a simple way to play Gaigel online. Its simple and easy. You don't need to register, just hop in and play.

:video_game: Here's why you should play:
* Play with your friends if you can't meet personally
* Flexible to Use: no account needed
* Free to Play (and no hidden ads, tracking or ingame purchases)
* Open Source: Simply improve the game by collaborating if you find any issues


### Built With

* [Bootstrap](https://getbootstrap.com)
* [JQuery](https://jquery.com)
* [Sails.js](https://sailsjs.com/)
* [Heroku Postgres](https://www.heroku.com/postgres)
* [Heroku Redis](https://elements.heroku.com/addons/heroku-redis)



<!-- GETTING STARTED -->
## Getting Started

<b>Please note:</b> This branch contains our approach to deploy this application to Heroku using Herokus Postgres and Redis service.


### Prerequisites

There are no prerequisites to install, as this application will solely be connected to Heroku. You will only need any editor to perform some small changes.


### Deployment

1. Clone the repo
   ```sh
   git clone https://github.com/DanielWidmayer/swabianGaigel/tree/deploy.git
   ```
2. Create a new App on Heroku and add the additional services you want to use like Redis, PostgreSQL, MongoDB, etc. You should also already provide the connection credentials to 
   these services as environment variables (they can be set under the "settings"-Tab). These Variables should be formatted as a connection-URL.
   
3. Perform some changes to ```/config/env/production.js```<br>
   If you want to use a Database other than PostgreSQL or a Session Store other than Redis, please follow the instructions in the corresponding section of the file and add your 
   personal environment variables instead.<br>
   <b>Mandatory:</b> Under the section "sockets" change the "onlyAllowOrigins" values to the Domain, where your application will be hosted on Heroku (typ. 
   `https://APP_NAME.herokuapp.com`)

4. Go to the "Deploy"-Tab of your newly created App on Heroku, there you will find the option to connect a repository for deployment. Connect your repository and you are done.


<!-- USAGE -->
## How to play

For a complete Tutorial on how to play and the game rule set with pictures, please refer to the available [Website](https://www.gaigel.club/#rules).



<!-- ROADMAP -->
## Roadmap :rocket:

See the [open issues](https://github.com/DanielWidmayer/swabianGaigel/issues) for a list of proposed features (and known issues).



<!-- CONTRIBUTING -->
## Contributing

Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.



<!-- CONTACT -->
## Contact

Daniel Widmayer - inf18157@lehre-dhbw-stuttgart.de <br>
Jens Buehler - inf18145@lehre.dhbw-stuttgart.de

Project Link: [https://github.com/DanielWidmayer/swabianGaigel](https://github.com/DanielWidmayer/swabianGaigel)



<!-- ACKNOWLEDGEMENTS -->
## Acknowledgements
* [Card Library](https://github.com/richardschneider/cardsJS)
* [GitHub Emoji Cheat Sheet](https://www.webpagefx.com/tools/emoji-cheat-sheet)
* [Img Shields](https://shields.io)
* [Choose an Open Source License](https://choosealicense.com)
* [PrivacyPolicies](https://app.privacypolicies.com/)
* [Bootstrap Icons](https://icons.getbootstrap.com/)





<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/DanielWidmayer/swabianGaigel.svg?style=for-the-badge
[contributors-url]: https://github.com/DanielWidmayer/swabianGaigel/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/DanielWidmayer/swabianGaigel.svg?style=for-the-badge
[forks-url]: https://github.com/DanielWidmayer/swabianGaigel/network/members
[stars-shield]: https://img.shields.io/github/stars/DanielWidmayer/swabianGaigel.svg?style=for-the-badge
[stars-url]: hhttps://github.com/DanielWidmayer/swabianGaigel/stargazers
[issues-shield]: https://img.shields.io/github/issues/DanielWidmayer/swabianGaigel.svg?style=for-the-badge
[issues-url]: https://github.com/DanielWidmayer/swabianGaigel/issues
[license-shield]: https://img.shields.io/github/license/DanielWidmayer/swabianGaigel.svg?style=for-the-badge
[license-url]: https://github.com/DanielWidmayer/swabianGaigel/blob/master/LICENSE.txt  
[product-screenshot]: assets/images/headLogo.png


