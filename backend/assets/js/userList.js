const ul = $("#userlist");

io.socket.get("/userlist", function (res, jres) {
    if (jres.statusCode != 200) {
        console.log(jres);
    } else {
        ul.empty();
        console.log(res);
        if (Array.isArray(res)) {
            res.forEach((user) => {
                ul.append(`<i class="bi bi-person-fill"></i>${user.name}${user.ready}<br>`);
            });
        } else {
            ul.append(`<i class="bi bi-person-fill"></i>${res.name}${res.ready}<br>`);
        }
    }
});

io.socket.on("userevent", function (data) {
    ul.empty();
    console.log(data);
    if (Array.isArray(data.users)) {
        data.users.forEach((user) => {
            ul.append(`<i class="bi bi-person-fill"></i>${user.name}${user.ready}<br>`);
        });
    } else ul.append(`<i class="bi bi-person-fill"></i>${data.users.name}${data.users.ready}<br>`);
});
