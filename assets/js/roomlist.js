// roomlist

const rl = $("#roomlist").children("tbody");
const activecard = $("#activeRoom");
const pwmodal = $("#passwordModal");

var rooms = [];
var activeRoom = {};
var activeHash = 0;

// ---onload---
window.onload = function () {
    $("#errModal").modal("show");
    activecard.hide();
    getAllRooms();
};

// ---Listelement related functions (getAllRooms, renderRoom, socket[listevent])---
function getAllRooms() {
    rooms = [];
    $.get("/roomList", function (data) {
        console.log(data);
        data.rooms.forEach((room) => {
            rooms.push(room);
            renderRoom(room);
        });
        if (data.active) {
            activeRoom = data.active;
            renderActive(data.active);
        }
        if (data.ahash) activeHash = data.ahash;
    });
}

function renderRoom(room) {
    console.log(room);
    let target = $(`#${room.hashID}`);
    if (room.empty) {
        target.remove();
        return 1;
    }

    let playerIcons = "";
    for (let i = 0; i < room.maxplayers; i++) {
        if (i < room.players.length) playerIcons += '<i class="bi bi-person-fill"></i>';
        else playerIcons += '<i class="bi bi-person"></i>';
    }

    if (target.length) {
        target.children(".rpl").html(playerIcons);
    } else {
        let row = document.createElement("tr");
        row.id = room.hashID;
        row.innerHTML = `<td class="rname">${room.name}</td><td class="rpl">${playerIcons}</td>`;
        if (room.password) {
            row.innerHTML += '<td class="rpw"><i class="bi bi-lock-fill"></i></td>';
            row.onclick = function () {
                $("#passwordModalLabel").html(`Password for ${room.name}`);
                $("#hiddenhash").val(room.hashID);
                pwmodal.modal("show");
            };
        } else {
            row.innerHTML += '<td class="rpw"><i class="bi bi-unlock-fill"></i></td>';
            row.onclick = function () {
                window.location.href = `/room/${room.hashID}`;
            };
        }
        rl.append(row);
    }
}

io.socket.on("listevent", function (data) {
    console.log(data.room);
    renderRoom(data.room);
    if (activeRoom.hashID == data.room.hashID && !data.room.players.includes(activeHash)) {
        activecard.html("");
        activecard.hide();
    }
});

// ---render active room---
function renderActive(room) {
    activecard.html(`<h4 class="text-center">${room.name}</h4><a type="button" class="btn btn-info m-2" href="/room/${room.hashID}">Reconnect</a>`);
    activecard.show();
}

// ---Password protected Rooms---
$("#pwForm").on("submit", function (e) {
    e.preventDefault();
    let hash = $("#hiddenhash").val();
    $.ajax({
        type: "POST",
        url: "/protect",
        data: { hash: hash, passwd: $("#passwd").val() },
        statusCode: {
            403: function (err) {
                $("#pwerr").html(err.responseJSON.err.msg);
            },
        },
        success: function (data) {
            window.location.href = `/room/${hash}`;
        },
    });
});

// ---Username Change---
function togglecolUI() {
    let cl = $("#unameplaceholder i")[0].className;
    $("#colUI").collapse("toggle");
    if (cl == "bi bi-pencil") $("#unameplaceholder i")[0].className = "bi bi-x-square";
    else $("#unameplaceholder i")[0].className = "bi bi-pencil";
    $("#unameinput").parent().children(".posterr").remove();
}

$("#changeUsernameForm").on("submit", function (e) {
    e.preventDefault();
    let vd = $("#unameinput").val();
    $.ajax({
        type: "POST",
        url: "/username",
        data: { uname: vd },
        statusCode: {
            400: function (err) {
                $("#unameinput").after(`<span class="posterr my-1 text-warning">${err.responseJSON}</span>`);
            },
        },
        success: function (data) {
            let temp = $("#unameplaceholder sup").html();
            $("#unameplaceholder").html(vd + "<sup>" + temp + "</sup>");
            $("#unameinput").parent().children(".posterr").remove();
            togglecolUI();
        },
    });
});
