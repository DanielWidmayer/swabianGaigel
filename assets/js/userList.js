const ul = $("#userlist");
var admin = false;
const userhash = parseInt(getCookie("userhash"));
const teamcolors = ["rgb(255,255,0)", "rgb(0,0,255)", "rgb(0,255,0)"];
const teambackground = ["rgba(255,255,0,0.2)","rgba(0,0,255,0.2)","rgba(0,255,0,0.2)"];

io.socket.on("userevent", function (data) {
    console.log(data);
    ul.empty();
    if (data.max >= 4) {
        for (let i = 0; i < data.max / 2; i++) {
            let hover = "", click = "";
            if (data.users && data.users[0].ready != undefined) {
                hover = "teamhover";
                click = `onclick="switchTeam(${i + 1});"`;
            }
            let el_team = `<ul class="teambanner ${hover}" style="border-color: ${teamcolors[i]}; background-color: ${teambackground[i]};" ${click}></ul>`;

            ul.append(el_team);
        }
    }
    data.users.forEach((user) => {
        let element = userElement(user);
        if (user.team) ul.children('ul').eq(user.team - 1).append(element);
        else ul.append(element); 
    });
    for (let i = 0; i < data.max / 2; i++) {
        if (ul.children('ul').eq(i).children().length < 2) {
            ul.children('ul').eq(i).append(`<span class="teamjoin"><i class="bi bi-plus-square" style="color: ${teamcolors[i]}"></i> click to join Team #${i + 1}</span>`);
        }
    }
    if (admin) {
        if (data.users.length >= data.max) $("#bAddBot").hide();
        else $("#bAddBot").show();
    }
});

io.socket.on("adminchange", function (data) {
    ul.after(`<div class="p-2">
        <button id="bshuffle" class="btn btn-primary adminbutton" title="Shuffle players" onclick="shuffle();">
        <i class="bi bi-dice-4"></i> Randomize</button>
        <button id="bAddBot" class="btn btn-warning adminbutton mx-2" title="Add Bot" onclick="addBot();">
        <i class="bi bi-person-square"></i> add Bot</button>
    </div>`);
    admin = true;
});

function userElement(user) {
    let playericon, playername, readyicon, kickbutton;
    let el = document.createElement('span');

    if (user.ready != undefined) {
        if (user.ready) readyicon = '<i class="bi bi-check-circle-fill text-success px-1"></i>';
        else readyicon = '<i class="bi bi-x-circle-fill text-warning px-1"></i>';
    } else readyicon = "";
   

    if (user.bot) {
        playericon = '<i class="bi bi-cpu px-2"></i>';
    } 
    else if (user.hashID == userhash) {
        playericon = `<i class="bi bi-person-circle px-2"></i>`
    }
    else {
        playericon = '<i class="bi bi-person-fill px-2"></i>';
    }

    playername = `${user.name}<span style="font-size: 0.85rem" class="px-2 text-secondary">#${user.hashID}</span>`;
    
    if (admin) {
        kickbutton = `<button class="btn btn-danger px-1 py-0" title="Kick Player" onclick="kickPlayer(${user.hashID});">
            <i class="bi bi-x-square"></i></button>`;
    } else kickbutton = "";

    el.innerHTML = readyicon + playericon + playername + kickbutton + "<br>";

    return el;
}

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

function switchTeam(team) {
    io.socket.post("/switchTeam", { team: team }, function (res, jres) {
        if (jres.statusCode != 200) {
            console.log(jres);
        } else {
            console.log(res);
        }
    });
}


function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
