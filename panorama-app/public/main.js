$(document).ready(function () {
  let projects = [];

  function loadData() {
    fetch("/api/projects?session_id=" + localStorage.getItem("session_id"), {
        method: "GET",
    }).then((data) => data.json())
    .then((json) => {
        projects = json;


        // create sample timeline chart for now
        const config = {
          type: "bar",
          data: {
            labels: ["1 am", "2 am", "3 am", "4 am", "5 am", "6 am"],
            datasets: [
              {
                label: "Error Events",
                data: [0, 4, 10, 2, 5],
                backgroundColor: "#A3E635",
                borderColor: "#000000",
                borderWidth: 3
              },
            ],
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        };
        const ctx = document.getElementById("timeline-chart");
        const timelineChart = new Chart(ctx, config);
    }).catch((error) => {
        // TODO: error messages for user 
    })
  }
  // check if user is signed in
  if (localStorage.getItem("session_id")) {
    // check if session id is valid
    fetch(
      "/api/users/check-session?session_id=" +
        localStorage.getItem("session_id"),
      {
        method: "GET",
      },
    )
      .then((data) => data.json())
      .then((json) => {
        // console.log(json);
        if (!json.success) {
          //invalid session
          localStorage.removeItem("session_id");
          window.location.href = "/signin.html";
        } else {
          //load user data + populate dashboard
          // get projects
          loadData();
        }
      });
  }
});
