const ul = $("#userlist");

io.socket.on("userevent", function (data) {
    ul.empty();
    //console.log(data);
    if (Array.isArray(data.users)) {
        data.users.forEach((user) => {
            let readyicon;
            if (user.ready) {
                readyicon = '<i class="bi bi-check-circle-fill"></i>';
            } else {
                readyicon = '<i class="bi bi-x-circle-fill"></i>';
            }
            ul.append(`${readyicon}<i class="bi bi-person-fill"></i>${user.name}<br>`);
        });
    } else {
        let readyicon;
        if (data.users.ready) {
            readyicon = '<i class="bi bi-check-circle-fill"></i>';
        } else {
            readyicon = '<i class="bi bi-x-circle-fill"></i>';
        }
        ul.append(`${readyicon}<i class="bi bi-person-fill"></i>${data.users.name}<br>`);
    }
});
