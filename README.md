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
* [Docker](https://www.docker.com/)
* [MongoDB](https://www.mongodb.com/)
* [Redis](https://redis.io/)



<!-- GETTING STARTED -->
## Getting Started

<b>Please note:</b> This branch contains our approach to deploy this application to a production environment using Docker. Docker provides an easy and fast deployment but it should probably not be used for an application that is expecting heavy traffic.


### Prerequisites

As you will need the Docker Engine to run Docker Containers, you should make sure to install it first. This can either be done by downloading and installing the whole software package from https://docs.docker.com/get-docker/ or by your prefered CLI. For more Information on _how to install Docker Engine_ please refer to the official [documentation](https://docs.docker.com/engine/install/).

Once you have installed the Docker Engine you should check if Docker Compose has also been already installed by trying the ```docker compose``` command. If it fails you will have to aslo install [Docker Compose](https://docs.docker.com/compose/install/) as well.

To make deployment even easier, we provided a little python script that deals with the creation of the .env-file so you don't have to do it manually. You can still create the .env-file youself manually but if you would like to use this little helper function you will need to have python (v3.6 or greater) installed on your machine. But this should generally not be a problem since most operating systems will have python pre-installed.

The Docker Engine and Docker Compose are the only two mandatory prerequisites you will need to launch this application.


### Deployment

1. Clone the repo
   ```sh
   git clone https://github.com/DanielWidmayer/swabianGaigel/tree/docker-deploy.git
   ```
2. Provide a .env-file
   This can either be done manually or by calling the python script. If you choose to do this manually, these are the environment variables you should consider:
   ```
   NODE_ENV                       _should be set to production_
   SESSION_SECRET                 _used to compute the hash of existing sessions. provide a random string_
   DATA_ENCRYPTION_KEY            _used to encrypt password protected database entries. provide a ! 32byte long ! string_
   MONGODB_INITDB_ROOT_USERNAME   _can be omitted. provide ! URL-safe ! username if wanted_
   MONGODB_INITDB_ROOT_PASSWORD   _can be omitted. provide ! URL-safe ! password if wanted_
   DOMAIN_NAME                    _trusted Domain for Websocket connections. provide your domain ! with protocol ! (e.g. https//www.example.com or http://93.184.216.34)
   SERVED_PORT                    _port this application will be served on. port 80 would be default for webapplications_
   SSL_ENABLE                     _set to True if this application should be served over HTTPS. omit if it should be served on HTTP_
   ```
   Please note that we are not completely sure if just setting SSL_ENABLE to "True" will result in the application being served over HTTPS as we haven't tested it yet because we 
   are missing an appropriate private server and certificate.
   
   Or you can call the python script which will automatically create some of the environment variables if you don't want to pass them manually.
   ```sh
   py envGenerator.py
   ```
3. Build the Containers
   ```sh
   docker compose build
   ```
4. Run the Containers
   ```sh
   docker compose up
   ```
   (_if you want to run them in the background you can add the ```-d``` parameter_)
5. (optional) Stop the Containers
   ```sh
   docker compose down
   ```
   (_if they are running in the foreground you may have to stop them using [ctrl+c] first_)

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


