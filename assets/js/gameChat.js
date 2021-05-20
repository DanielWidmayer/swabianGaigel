// Global Chat Vars
const chf = $("#chatfield");
const gamef = $("#gamehistoryfield");
const fpost = $("#fpost");
const bpost = $("#bpost");

// Automatic Scroll if user is at bottom of chat
function appendMessage(text, field) {
  field.append(text);
  field.animate({ scrollTop: field[0].scrollHeight }, 500);
}

// Chat Socket Events
io.socket.on("joinmsg", function (data) {
  appendMessage(
    `<p style="font-weigth: bold;">${data.user} ${data.text}</p>`,
    chf
  );
});

io.socket.on("leavemsg", function (data) {
  // data.user = username, data.text = message, data.bot = botname
  appendMessage(
    `<p style="font-weigth: bold;">${data.user} ${data.text} ${data.bot}</p>`,
    chf
  );
});

io.socket.on("controllermsg", function (data) {
  appendMessage(`<p>${data.msg}</p>`, gamef);
});

io.socket.on("chatmsg", function (data) {
  appendMessage(
    `<div class="chatmsg"><b>${data.user}:&nbsp;</b>${data.text}</div>`,
    chf
  );
});

io.socket.on("turnmsg", function (data) {
  let text;
  if (userHash == data.user.hashID) {
    text =
      "<p>You have won the trick.</p><p>Your score is now " +
      data.user.score +
      '</p><hr class="hr-thick"/><p>It\'s your turn.</p>';
  } else {
    text =
      "<p>" +
      data.user.name +
      " has won the trick.</p><p>" +
      data.user.name +
      "'s score is now " +
      data.user.score +
      '</p><hr class="hr-thick"/><p>It\'s ' +
      data.user.name +
      "'s turn.</p>";
  }
  appendMessage(`${text}`, gamef);
});

io.socket.on("firstturnmsg", function (data) {
  let text;
  if (userHash == data.user.hashID) {
    text = "<p>It's your turn to start the game.</p>";
  } else {
    text = `<p>It\'s ${data.user.name}'s turn to start the game.</p>`;
  }
  appendMessage(`${text}`, gamef);
});

io.socket.on("cardplayedmsg", function (data) {
  let icon = getHtmlSymbol(data.card.symbol);
  let cardletter = getCardLetter(data.card.value);
  let text;
  if (userHash == data.user.hashID) {
    text = "You have";
  } else {
    text = `${data.user.name} has`;
  }
  appendMessage(`<p>${text} played a ${icon} ${cardletter}</p>`, gamef);
});

io.socket.on("paircalledmsg", function (data) {
  let text;
  let icon = getHtmlSymbol(data.symbol);
  if (userHash == data.user.hashID) {
    text = `<hr class="mb-0"/><p>You have melded in ${icon}.</p><p>Your score is now ${data.user.score}</p><hr class="mt-0"/>`;
  } else {
    text = `<hr class="mb-0"/><p>${data.user.name} has melded in ${icon}.</p><p>${data.user.name}'s score is now ${data.user.score}</p><hr class="mt-0"/>`;
  }
  appendMessage(`${text}`, gamef);
});

io.socket.on("cardrobmsg", function (data) {
  let text;
  let icon = getHtmlSymbol(data.card.symbol);
  let cardletter = getCardLetter(data.card.value);
  if (userHash == data.user.hashID) {
    text = `<hr class="mb-0"/><p>You have robbed the ${icon} ${cardletter}.</p><hr class="mt-0"/>`;
  } else {
    text = `<hr class="mb-0"/><p>${data.user.name} has robbed the ${icon} ${cardletter}.</p><hr class="mt-0"/>`;
  }
  appendMessage(`${text}`, gamef);
});

io.socket.on("gameovermsg", function (data) {
  let text;
  if (data.users.find((el) => el.hashID == userHash)) {
    text = `<hr class="mb-0"/><p>Congratulations You have won the game!</p><hr class="mt-0 hr-thick"/>`;
  } else {
    let winners = "";
    for (const user of data.users) {
      winners += user.name + " ";
    }
    text = `<hr class="mb-0"/><p>Game Over! ${winners} has won the game!</p><hr class="mt-0 hr-thick"/>`;
  }
  appendMessage(`${text}`, gamef);
});

io.socket.on("firstcardtypemsg", function (data) {
  let text;
  if (userHash == data.user.hashID) {
    text = `<p>You have called ${data.first_type}.</p>`;
  } else {
    text = `<p>${data.user.name} has called ${data.first_type}.</p>`;
  }
  appendMessage(`${text}`, gamef);
});

function getHtmlSymbol(symbol) {
  let icon;
  switch (symbol) {
    case 0:
      icon = '<img class="img-icon-thin" src="../images/eichel.png"></img>';
      break;
    case 1:
      icon = '<img class="img-icon" src="../images/schellen.png"></img>';
      break;
    case 2:
      icon = '<img class="img-icon" src="../images/herz.png"></img>';
      break;
    case 3:
      icon = '<img class="img-icon" src="../images/blatt.png"></img>';
      break;
    default:
      icon = "";
      break;
  }
  return icon;
}

function getCardLetter(value) {
  let cardletter;
  switch (value) {
    case 0:
      cardletter = "7";
      break;
    case 2:
      cardletter = "U";
      break;
    case 3:
      cardletter = "O";
      break;
    case 4:
      cardletter = "K";
      break;
    case 10:
      cardletter = "10";
      break;
    case 11:
      cardletter = "A";
      break;

    default:
      cardletter = "";
      break;
  }
  return cardletter;
}

bpost.on("click", postmsg);

fpost.keypress(function (e) {
  var keycode = e.keyCode ? e.keyCode : e.which;
  if (keycode == "13") postmsg();
});

function postmsg() {
  if (fpost.val().length > 0) {
    //console.log("posting");
    io.socket.post("/chatpost", { text: fpost.val() }, function (res, jres) {
      if (jres.statusCode != 200) {
        //console.log(jres);
        //console.log(res);
      } else {
        //console.log(res);
      }
      fpost.val("");
    });
  }
}
