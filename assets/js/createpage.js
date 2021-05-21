// create

// --------------------------------------------------------------------- Username Change
function togglecolUI() {
    let cl = $('#unameplaceholder i')[0].className;
    $('#colUI').collapse('toggle');
    if (cl == "bi bi-pencil") $('#unameplaceholder i')[0].className = "bi bi-x-square";
    else $('#unameplaceholder i')[0].className = "bi bi-pencil";
    $('#unameinput').parent().children('.posterr').remove();
}


$('#changeUsernameForm').on('submit', function(e) {
    e.preventDefault();
    let vd = $('#unameinput').val();
    $.ajax({
        type: "POST",
        url: "/username",
        data: { uname: vd },
        statusCode: {
            400: function (err) {
                $('#unameinput').after(`<span class="posterr mt-1" style="color: red; font-size: 0.5em!important; ">${err.responseJSON}</span>`);
            }
        },
        success: function (data) {
            let temp = $('#unameplaceholder sup').html();
            $('#unameplaceholder').html(vd + "<sup>" + temp + "</sup>");
            $('#unameinput').parent().children('.posterr').remove();
            togglecolUI();
        }
    });
})