const ul = $("#userlist");
var admin = false;

io.socket.on("userevent", function (data) {
    let playericon, playername, readyicon, kickbutton;
    ul.empty();
    data.users.forEach((user) => {
        playername = `${user.name}<span style="font-size: 0.85rem" class="px-2 text-secondary">#${user.hashID}</span>`;     //<------ JBHR --- start
        if (user.bot) {                         
            playericon = '<i class="bi bi-person-square px-2"></i>';
        } else {
            playericon = '<i class="bi bi-person-fill px-2"></i>';
        }                               
        if (user.ready != undefined) {
            if (user.ready) readyicon = '<i class="bi bi-check-circle-fill text-success px-1"></i>';
            else readyicon = '<i class="bi bi-x-circle-fill text-warning px-1"></i>';
        } else readyicon = "";
        //ul.append(`${playericon}${user.name}${readyicon}<br>`); 
        console.log(admin);
        if (admin) {
            kickbutton = `<button class="btn btn-danger" title="Kick Player" onclick="kickPlayer(${user.hashID});">
                <i class="bi bi-x-square"></i></button>`;
        } else kickbutton = "";
        ul.append(`${readyicon}${playericon}${playername}${kickbutton}<br>`);         //<---- JBHR ---- end
    });
    if (admin) {
        if (data.users.length >= data.max) $('#bAddBot').hide();
        else $('#bAddBot').show();
    }
});


io.socket.on("adminchange", function (data) {
    ul.after(`<div>
        <button id="bshuffle" class="btn btn-primary" title="Shuffle players" onclick="shuffle();">
        <i class="bi bi-dice-4"></i> Randomize</button>
        <button id="bAddBot" class="btn btn-warning" title="Add Bot" onclick="addBot();">
        <i class="bi bi-person-square"></i> add Bot</button>
    </div>`);
    admin = true;
})

function shuffle() {
    io.socket.post("/randomOrder", function (res, jres) {
        if (jres.statusCode != 200) {
            console.log(jres);
        } else {
            console.log(res);
        }
    });
}

function addBot() {
    io.socket.post("/addBot", function (res, jres) {
        if (jres.statusCode != 200) {
            console.log(jres);
        } else {
            console.log(res);
        }
    });
}

function kickPlayer(userhash) {
    io.socket.post("/kickPlayer", { target: userhash }, function (res, jres) {
        if (jres.statusCode != 200) {
            console.log(jres);
        } else {
            console.log(res);
        }
    });
}

function switchTeam() {
    io.socket.post("/switchTeam", function (res, jres) {
        if (jres.statusCode != 200) {
            console.log(jres);
        } else {
            console.log(res);
        }
    });
}

