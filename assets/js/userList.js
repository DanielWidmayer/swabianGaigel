const ul = $("#userlist");

io.socket.on("userevent", function (data) {
    let playericon, playername, readyicon;
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
        ul.append(`${readyicon}${playericon}${playername}<br>`);         //<---- JBHR ---- end
    });
});

/* text =<div class="game-utils">
<button id="bshuffle" class="btn btn-game btn-secondary" title="Shuffle players" onclick="shufflePlayers"><i class="bi bi-shuffle"></i> </button>
</div> */
