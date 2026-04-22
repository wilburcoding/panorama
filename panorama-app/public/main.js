$(document).ready(function () {
  let projects = [];
  let dashboardTimeline = null;

  async function loadData() {
    const resp1 = await fetch(
      "/api/projects?session_id=" + localStorage.getItem("session_id"),
      {
        method: "GET",
      },
    );
    const projects_data = await resp1.json();

    projects = projects_data;
    for (let i = 0; i < projects.length; i++) {
      projects[i].deployments = [];
    }

    // create sample timeline chart for now
    const config = {
      type: "bar",
      data: {
        labels: ["1 am", "2 am", "3 am", "4 am", "5 am", "6 am"],
        datasets: [
          {
            label: "Error Events",
            data: [0, 0, 0, 0, 0, 0],
            backgroundColor: "#31a047",
            borderColor: "#000000",
            borderWidth: 3,
            borderSkipped: false,
            borderRadius: 3,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: false,
            },
            ticks: {
              color: "#000000",
              stepSize: 1,
              font: { size: 13, color: "#000000", weight: "500" },
            },
          },
          x: {
            grid: { display: false },
            ticks: {
              color: "#000000",
              font: { size: 13, weight: "500" },
              autoSkip: false,
              maxRotation: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "#FFFFFF",
            borderColor: "#000000",
            borderWidth: 1.5,
            cornerRadius: 0,
            titleColor: "#000000",
            bodyColor: "#000000",
            padding: 10,
            boxPadding: 5,
            titleFont: { size: 15, weight: "600" },
          },
        },
      },
    };
    const ctx = document.getElementById("timeline-chart");
    const timelineChart = new Chart(ctx, config);
    dashboardTimeline = timelineChart;

    // populate sidebar project list
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      $("#sidebar-plist").append(`
            <button class="sidebar-project" id="sbp-${i + 2}">
                <div class="project-color" style="background-color: ${project.color}"></div>${project.name}
            </button>`);
      $("#sbp-" + (i + 2)).click(function () {
        console.log("project " + project.id);
        window.location.href =
          "/dashboard.html?projectId=" + project.id + "&projectInfo";
      });
    }

    // get deployments for each project
    let pids = "";
    for (let i = 0; i < projects.length; i++) {
      pids += projects[i].id + ",";
    }
    pids = pids.slice(0, -1); // extra comma at end
    const response = await fetch("/api/deployments?project_id=" + pids, {
      method: "GET",
    });
    const deployments = await response.json();
    let dids = "";
    for (let i = 0; i < deployments.length; i++) {
      const deployment = deployments[i];
      const project = projects.find((p) => p.id === deployment.project_id);
      if (project) {
        deployment.error_events = [];
        project.deployments.push(deployment);

        dids += deployment.id + ",";
      }
    }
    dids = dids.slice(0, -1);

    // get error events for each deploymentx
    console.log(dids);
    const error_events_res = await fetch(
      "/api/error_events?deployment_id=" + dids,
      {
        method: "GET",
      },
    );
    const error_events = await error_events_res.json();
    for (let i = 0; i < error_events.length; i++) {
      const event = error_events[i];
      const deployment = deployments.find((d) => d.id === event.deployment_id);
      if (deployment) {
        deployment.error_events.push(event);
      }
    }
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
          loadData().then(() => {
            checkPage();
          });
        }
      });
  }

  // check page state
  function checkPage() {
    function parseSqlTimestamp(timestamp) {
      if (!timestamp || typeof timestamp !== "string") {
        return new Date(timestamp);
      }

      if (/Z$|[+-]\d{2}:\d{2}$/.test(timestamp)) {
        return new Date(timestamp);
      }

      return new Date(timestamp.replace(" ", "T") + "Z");
    }

    // readable time
    function formatTime(timestamp) {
      const current_date = new Date();
      const event_date = parseSqlTimestamp(timestamp);
      const diff_ms = current_date - event_date;

      if (diff_ms < 60 * 1000) {
        // less than a minute
        return Math.floor(diff_ms / 1000) + " seconds ago";
      } else if (diff_ms < 60 * 60 * 1000) {
        // less than an hour
        return Math.floor(diff_ms / (60 * 1000)) + " minutes ago";
      } else if (diff_ms < 24 * 60 * 60 * 1000) {
        // less than a day
        return Math.floor(diff_ms / (60 * 60 * 1000)) + " hours ago";
      } else if (diff_ms < 30 * 24 * 60 * 60 * 1000) {
        // less than a month (im lazy so assume 30 days in month)
        return Math.floor(diff_ms / (24 * 60 * 60 * 1000)) + " days ago";
      } else if (diff_ms < 365 * 24 * 60 * 60 * 1000) {
        // less than a year
        return Math.floor(diff_ms / (30 * 24 * 60 * 60 * 1000)) + " months ago";
      } else {
        // years
        return Math.floor(diff_ms / (365 * 24 * 60 * 60 * 1000)) + " years ago";
      }
    }
    const params = new URLSearchParams(window.location.search);
    if (params.has("projectOverview")) {
      console.log("overview");
      $("#dashboard-content").hide();
      $("#settings-content").hide();
      $("#project-content").hide();
      $("#sproject-content").show();
    } else if (params.has("projectInfo")) {
      console.log("proj");
      const project_id = params.get("projectId");
      if (project_id) {
        // populate project info page
        $("#dashboard-content").hide();
        $("#settings-content").hide();
        $("#sproject-content").hide();
        $("#project-content").show();
      } else {
        // redirect bcs no project id
        window.location.href = "/dashboard.html";
      }
    } else if (params.has("settings")) {
      // show settings
      console.log("settings");
      $("#dashboard-content").hide();
      $("#project-content").hide();
      $("#sproject-content").hide();
      $("#settings-content").show();
    } else {
      // dashboard overview
      $("#dashboard-content").show();
      $("#project-content").hide();
      $("#sproject-content").hide();
      $("#settings-content").hide();

      // populate dashboard

      let active_deployment_count = 0;
      console.log(projects);
      for (let i = 0; i < projects.length; i++) {
        for (let j = 0; j < projects[i].deployments.length; j++) {
          console.log(projects[i].deployments[j]);
          if (projects[i].deployments[j].status === "active") {
            active_deployment_count += 1;
          }
        }
      }
      $("#d-activedeployments").text(active_deployment_count);

      let new_error_count = 0;
      for (let i = 0; i < projects.length; i++) {
        for (let j = 0; j < projects[i].deployments.length; j++) {
          const new_errors = projects[i].deployments[j].error_events.filter(
            (e) => {
              const event_time = parseSqlTimestamp(e.timestamp);
              const now = new Date();
              return (now - event_time) / (1000 * 60 * 60) < 24; // < 24 hours is considered a new error
            },
          );
          new_error_count += new_errors.length;
        }
      }

      $("#d-newerrors").text(new_error_count);

      let unresolved_error_count = 0;
      for (let i = 0; i < projects.length; i++) {
        for (let j = 0; j < projects[i].deployments.length; j++) {
          const unresolved_errors = projects[i].deployments[
            j
          ].error_events.filter((e) => e.status !== "resolved");
          unresolved_error_count += unresolved_errors.length;
        }
      }

      $("#d-unresolvederrors").text(unresolved_error_count);

      // populate timeline chart
      let timelineData = [0, 0, 0, 0, 0, 0]; // representing hours before now
      for (let i = 0; i < projects.length; i++) {
        for (let j = 0; j < projects[i].deployments.length; j++) {
          const error_events = projects[i].deployments[j].error_events;
          for (let k = 0; k < error_events.length; k++) {
            const event_time = parseSqlTimestamp(error_events[k].timestamp);
            const now = new Date();
            const hours_before = (now - event_time) / 1000 / 60 / 60;
            console.log("Hours before: " + hours_before);
            if (hours_before < 6) {
              timelineData[5 - Math.floor(hours_before)] += 1;
            }
          }
        }
        dashboardTimeline.data.datasets[0].data = timelineData;
        dashboardTimeline.update();
      }

      // labels
      let labels = [];
      for (let i = 5; i >= 0; i--) {
        const time = new Date(Date.now() - i * 60 * 60 * 1000);
        const hours = time.getHours();
        const suffix = hours >= 12 ? "pm" : "am";
        labels.push(((hours + 11) % 12) + 1 + " " + suffix);
      }
      dashboardTimeline.data.labels = labels;

      console.log(timelineData);

      //populate problematic deployments table
      let problematic_deployments = [];
      // sort deployments by number of unresolved errors
      let deployments = [];
      for (let i = 0; i < projects.length; i++) {
        deployments.push(...projects[i].deployments);
      }

      problematic_deployments = deployments.sort((a, b) => {
        const a_unresolved = a.error_events.filter(
          (e) => e.status !== "resolved",
        ).length;
        const b_unresolved = b.error_events.filter(
          (e) => e.status !== "resolved",
        ).length;
        return b_unresolved - a_unresolved;
      });
      problematic_deployments = problematic_deployments.slice(0, 6); // cap at 6
      for (let i = 0; i < problematic_deployments.length; i++) {
        const deployment = problematic_deployments[i];
        if (deployment.status !== "active") {
          continue;
        }
        const unresolved_errors = deployment.error_events.filter(
          (e) => e.status !== "resolved",
        );
        console.log(deployment);
        $("#wdeployment-container").append(`
            <div class="wdeployment-card">
                <h1>${deployment.name}</h1>
                <div
                  style="
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: center;
                  "
                >
                    <p>${unresolved_errors.length} ${unresolved_errors.length == 1 ? "error" : "errors"}</p>
                    <div class="change">
                        <p>+1</p>
                    </div>
                </div>
            </div>
            <hr>
        `);
      }

      // populate projects list
      for (let i = 0; i < projects.length; i++) {
        let project_active = false;
        let unresolved_errors = 0;
        let latest_time = null;

        for (let j = 0; j < projects[i].deployments.length; j++) {
          if (projects[i].deployments[j].status === "active") {
            project_active = true;
          }
          for (
            let k = 0;
            k < projects[i].deployments[j].error_events.length;
            k++
          ) {
            if (
              projects[i].deployments[j].error_events[k].status !== "resolved"
            ) {
              unresolved_errors += 1;
            }

            if (latest_time == null) {
              latest_time =
                projects[i].deployments[j].error_events[k].timestamp;
            } else {
              const event_time = parseSqlTimestamp(
                projects[i].deployments[j].error_events[k].timestamp,
              );
              const latest_event_time = parseSqlTimestamp(latest_time);
              if (event_time > latest_event_time) {
                latest_time =
                  projects[i].deployments[j].error_events[k].timestamp;
              }
            }
          }
        }

        $("#dashboard-plist").append(`
        <div class="dproject-card">
            <div class="dproject-info-item">
                <h1>${projects[i].name}</h1>
                <div class="dproject-status ${project_active ? "active" : "inactive"}">
                    <p>${project_active ? "Active" : "Inactive"}</p>
                </div>
            </div>
            <div class="dproject-info">
                <div class="dproject-info-item">
                <i class="ph ph-warning"></i>
                <p>${unresolved_errors} Unresolved Errors</p>
                </div>
                <p>/</p>
                <div class="dproject-info-item">
                <i class="ph ph-clock"></i>
                <p>${latest_time ? "Last error " + formatTime(latest_time) : "No errors"}</p>
                </div>
            </div>
        </div>
        <hr />
            `);
      }
    }
  }

  //sidebar buttons
  $("#sidebar-settings").click(function () {
    window.location.href = "/dashboard.html?settings";
  });
  $("#sidebar-dashboardb").click(function () {
    window.location.href = "/dashboard.html";
  });
  $("#sbp-1").click(function () {
    window.location.href = "/dashboard.html?projectOverview";
  });
});
