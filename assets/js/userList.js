const ul = $("#userlist");

io.socket.on("userevent", function (data) {
    ul.empty();
    if (Array.isArray(data.users)) {
        data.users.forEach((user) => {
            let readyicon;
            if (user.ready) {
                readyicon = '<i class="bi bi-check-circle-fill text-success px-2"></i>';
            } else {
                readyicon = '<i class="bi bi-x-circle-fill text-warning px-2"></i>';
            }
            ul.append(`<i class="bi bi-person-fill px-1"></i>${user.name}${readyicon}<br>`);
        });
    } else {
        let readyicon;
        if (data.users.ready) {
            readyicon = '<i class="bi bi-check-circle-fill text-success"></i>';
        } else {
            readyicon = '<i class="bi bi-x-circle-fill text-warning"></i>';
        }
        ul.append(`<i class="bi bi-person-fill px-1"></i>${data.users.name}${readyicon}<br>`);
    }
});

/* text =<div class="game-utils">
<button id="bshuffle" class="btn btn-game btn-secondary" title="Shuffle players" onclick="shufflePlayers"><i class="bi bi-shuffle"></i> </button>
</div> */
