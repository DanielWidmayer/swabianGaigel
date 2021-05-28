const ul = $("#userlist");
var admin = false;
var game = false;
const userhash = parseInt(getCookie("userhash"));
const teamcolors = ["team-yellow", "team-blue", "team-green"];

io.socket.on("userevent", function (data) {
    game = data.ingame;
    ul.empty();
    if (data.max >= 4) {
        for (let i = 0; i < data.max / 2; i++) {
            let hover = "",
                click = "";
            if (!data.ingame) {
                hover = "teamhover";
                click = `onclick="switchTeam(${i + 1});"`;
            }
            let el_team = `<ul class="teambanner ${hover} ${teamcolors[i]}" ${click}></ul>`;

            ul.append(el_team);
        }
    }
    data.users.forEach((user) => {
        let element = userElement(user);
        if (user.team)
            ul.children("ul")
                .eq(user.team - 1)
                .append(element);
        else ul.append(element);
    });
    for (let i = 0; i < data.max / 2; i++) {
        if (ul.children("ul").eq(i).children().length < 2) {
            ul.children("ul")
                .eq(i)
                .append(`<span class="teamjoin"><i class="bi bi-plus-square ${teamcolors[i]}"></i> click to join Team #${i + 1}</span>`);
        }
    }
    if (admin) {
        if (data.users.length >= data.max) $("#bAddBot").hide();
        else $("#bAddBot").show();

        if (data.ingame) $("#adminbar").remove();
    }
});

io.socket.on("adminchange", function (data) {
    if (!game) {
        ul.after(`<div class="p-2" id="adminbar">
        <button id="bshuffle" class="btn btn-primary adminbutton" title="Shuffle players" onclick="shuffle();">
        <i class="bi bi-dice-4"></i> Shuffle</button>
        <button id="bAddBot" class="btn btn-primary adminbutton mx-2" title="Add Bot" onclick="addBot();">
        <i class="bi bi-cpu"></i> Add Bot</button>
        <a id="binvite" class="btn btn-primary" onclick="copyHrefToClipboard();">
        <i class="bi bi-person-plus-fill"></i> Invite</a>
        </div>`);
    }
    $("#binvite").popover({ trigger: "manual", placement: "bottom", content: "Link copied!", animation: true });
    admin = true;
});

function userElement(user) {
    let playericon, playerbtn, playername, readyicon, kickbutton;
    let el = document.createElement("span");

    if (!game) {
        if (user.ready) readyicon = '<i class="bi bi-check-circle-fill text-success px-1"></i>';
        else readyicon = '<i class="bi bi-x-circle-fill text-warning px-1"></i>';
    } else readyicon = "";

    if (user.bot) {
        playericon = '<i class="bi bi-cpu px-2"></i>';
    } else if (user.hashID == userhash) {
        playericon = `<i class="bi bi-person-circle px-2"></i>`;
    } else {
        playericon = '<i class="bi bi-person-fill px-2"></i>';
    }

    playername = `${user.name}<span style="font-size: 0.85rem" class="px-2 text-secondary">#${user.hashID}</span>`;

    if (admin && user.hashID != userhash) {
        playerbtn = `<a class="btn-transparent text-white p-0 m-0 align-baseline" type="button" id="userdropdown${user.hashID}" data-bs-toggle="dropdown" aria-expanded="false">
          ${playericon}${playername}</a>
        <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="userdropdown${user.hashID}">
          <li><a class="dropdown-item" onclick="kickPlayer(${user.hashID});" href="#">Kick Player</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#">Cancel</a></li>
        </ul>`;
    } else playerbtn = playericon + playername;

    el.innerHTML = readyicon + playerbtn + "<br>";

    return el;
}

function shuffle() {
    io.socket.post("/randomOrder", function (res, jres) {
        if (jres.statusCode != 200) {
            console.log(jres);
        }
    });
}

function addBot() {
    io.socket.post("/addBot", function (res, jres) {
        if (jres.statusCode != 200) {
            console.log(jres);
        }
    });
}

function kickPlayer(userhash) {
    io.socket.post("/kickPlayer", { target: userhash }, function (res, jres) {
        if (jres.statusCode != 200) {
            console.log(jres);
        }
    });
}

function switchTeam(team) {
    io.socket.post("/switchTeam", { team: team }, function (res, jres) {
        if (jres.statusCode != 200) {
            console.log(jres);
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
