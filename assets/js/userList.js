const ul = $("#userlist");
var admin = false;

io.socket.on("userevent", function (data) {
    let playericon, playername, readyicon, kickbutton;
    ul.empty();
    data.users.forEach((user) => {
        playername = `${user.name}<span style="font-size: 0.85rem" class="px-2 text-secondary">#${user.hashID}</span>`;
        if (user.bot) {
            playericon = '<i class="bi bi-cpu px-2"></i>';
        } else {
            playericon = '<i class="bi bi-person-fill px-2"></i>';
        }
        if (user.ready != undefined) {
            if (user.ready) readyicon = '<i class="bi bi-check-circle-fill text-success px-1"></i>';
            else readyicon = '<i class="bi bi-x-circle-fill text-warning px-1"></i>';
        } else readyicon = "";
        ul.append(`${readyicon}${playericon}${playername}<br>`);
    });
    if (admin) {
        if (data.users.length >= data.max) $("#bAddBot").hide();
        else $("#bAddBot").show();
    }
});
