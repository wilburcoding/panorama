$(document).ready(function () {
  let projects = [];
  let dashboardTimeline = null;

  // base chart config
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
      responsive: true,
      maintainAspectRatio: false,
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
          stacked: true,
          display: false,
        },
        x: {
          grid: { display: false },
          ticks: {
            color: "#000000",
            font: { size: 13, weight: "500" },
            autoSkip: false,
            maxRotation: 0,
          },
          stacked: true,
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

  // handle modals
  function openModal(options) {
    $("#edit-modal-content").html(`<h1 id="modal-title">Edit Project Details</h1>`);
    $("#modal-title").text(options.title);
    for (let i = 0; i < options.fields.length; i++) {
      const field = options.fields[i];
      // field data: placeholder, value (text/textarea), options (select), label (label of field), type (text/textarea/select), id (for when data is returned)
      // for select, options is array of {label, value}

      if (field.type === "text") {
        $("#edit-modal-content").append(`
        <p class="modal-label">${field.label}</p>
        <input type="text" placeholder="${field.placeholder}" value="${field.value}" />
      `);
      } else if (field.type == "textarea") {
        $("#edit-modal-content").append(`
          <p class="modal-label">${field.label}</p>
          <textarea placeholder="${field.placeholder}">${field.value}</textarea>
        `);
      } else if (field.type == "select") {
        let options_html = "";
        for (let j =0; j < field.options.length; j++) {
          const option = field.options[j];
          options_html += `<option value="${option.value}">${option.label}</option>`;
        }

        $("#edit-modal-content").append(`
            <p class="modal-label">${field.label}</p>
            <select id="modal-item-${field.id}">
            ${options_html}
            </select>
          `);
      }
    }
    $("#edit-modal-content").append(`<button id="modal-save">Save</button>`);
    $("#edit-modal-content").append(`<p id="error-message"></p>`);
    $("#modal-save").off("click");
    let return_data = {};
    function returnData() {
      return return_data;
    }
    $("#modal-save").click(function() {
      let data = {};
      for (let i = 0; i < options.fields.length; i++) {
        const field = options.fields[i];
        data[field.id] = $("#modal-item-" + field.id).val();
      }

      // validate data -> no empty fields
      for (let key in data) {
        if (data[key] === "") {
          $("#error-message").text("Please fill out all fields");
          return;
        }
      }

      return_data = data;
      returnData();

      
    })

  }
  // check page state
  async function checkPage() {
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
        return Math.floor(diff_ms / 1000) + " second(s) ago";
      } else if (diff_ms < 60 * 60 * 1000) {
        // less than an hour
        return Math.floor(diff_ms / (60 * 1000)) + " minute(s) ago";
      } else if (diff_ms < 24 * 60 * 60 * 1000) {
        // less than a day
        return Math.floor(diff_ms / (60 * 60 * 1000)) + " hour(s) ago";
      } else if (diff_ms < 30 * 24 * 60 * 60 * 1000) {
        // less than a month (im lazy so assume 30 days in month)
        return Math.floor(diff_ms / (24 * 60 * 60 * 1000)) + " day(s) ago";
      } else if (diff_ms < 365 * 24 * 60 * 60 * 1000) {
        // less than a year
        return (
          Math.floor(diff_ms / (30 * 24 * 60 * 60 * 1000)) + " month(s) ago"
        );
      } else {
        // years
        return (
          Math.floor(diff_ms / (365 * 24 * 60 * 60 * 1000)) + " year(s) ago"
        );
      }
    }
    const params = new URLSearchParams(window.location.search);
    if (params.has("projectOverview")) {
      // projects overview -> cards with each project
      $("#dashboard-content").hide();
      $("#settings-content").hide();
      $("#sproject-content").hide();
      $("#project-content").show();
      $("#serror-content").hide();
      $("#sdeployment-content").hide();

      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const create_date = parseSqlTimestamp(project.created_at);

        let unresolved_errors = 0;
        let latest_time = null;
        for (let j = 0; j < project.deployments.length; j++) {
          for (let k = 0; k < project.deployments[j].error_events.length; k++) {
            if (project.deployments[j].error_events[k].status !== "resolved") {
              unresolved_errors += 1;
            }
            if (latest_time == null) {
              latest_time = project.deployments[j].error_events[k].timestamp;
            } else if (
              parseSqlTimestamp(
                project.deployments[j].error_events[k].timestamp,
              ) > parseSqlTimestamp(latest_time)
            ) {
              latest_time = project.deployments[j].error_events[k].timestamp;
            }
          }
        }
        const p_id = project.id;
        let timeline_data = [0, 0, 0, 0, 0, 0];
        for (let j = 0; j < project.deployments.length; j++) {
          const error_events = project.deployments[j].error_events;
          for (let k = 0; k < error_events.length; k++) {
            const event_time = parseSqlTimestamp(error_events[k].timestamp);
            const now = new Date();
            const hours_before = (now - event_time) / 1000 / 60 / 60;
            if (hours_before < 24) {
              timeline_data[5 - Math.floor(hours_before / 4)] += 1;
            }
          }
        }

        let labels = [];
        for (let i = 5; i >= 0; i--) {
          const time = new Date(Date.now() - i * 4 * 60 * 60 * 1000);
          const hours = time.getHours();
          const suffix = hours >= 12 ? "pm" : "am";
          labels.push(((hours + 11) % 12) + 1 + " " + suffix);
        }

        $("#project-overview-content").append(`
            <div
            class="dashboard-card project-overview-card"
            style="width: 45%; padding: 0" id="project-overview-${project.id}"
          >
            <div
              style="
                width: 100%;
                height: 50px;
                background-color: ${project.color};
                border-bottom: solid 2px black;
              "
            ></div>
            <div style="padding: 20px;width:100%;box-sizing: border-box">
              <div class="project-card-info" style="justify-content: space-between;">
                <h1>${project.name}</h1>
              </div>
              <p class="project-card-create">Created on ${create_date.getMonth() + 1}/${create_date.getDate()}/${create_date.getFullYear()}</p>
              <h2 class="project-card-sectionh" style="margin-top: 20px">
                Description
              </h2>

              <p class="main-p">
                ${project.description}
              </p>

              <hr class="hr-dotted" style="margin-top: 13px" />
              <div class="project-card-info">
                <div class="project-card-info-subitem">
                  <h3>Unresolved Errors</h3>
                  <p>${unresolved_errors}</p>
                </div>
                <div class="project-card-info-subitem">
                  <h3>Last Error</h3>
                  <p>${latest_time == null ? "No errors found" : formatTime(latest_time)}</p>
                </div>
              </div>
              <div class="project-error-chart" style="width:100%; height: 100px;position: relative">
                ${timeline_data.filter((v) => v > 0).length === 0 ? "<div style='width:100%;height:100px;position: absolute;display:flex;align-items:center;justify-content:center;color:#4a4a4a'><p style='margin-bottom:40px;font-size:14px;'>No errors in the last 24 hours</p></div>" : ""}
                <canvas id="project-chart${project.id}" style="width: 100%; height: 100%;"></canvas>
              </div>
            </div>
          </div>
        `);
        const ctx = document.getElementById("project-chart" + p_id);
        let new_config = JSON.parse(JSON.stringify(config));
        const timelineChart = new Chart(ctx, new_config);
        timelineChart.data.datasets[0].data = timeline_data;
        timelineChart.data.labels = labels;
        timelineChart.data.datasets[0].backgroundColor = project.color;
        timelineChart.update();

        $("#project-overview-" + p_id).click(function () {
          window.location.href =
            "/dashboard.html?projectId=" + p_id + "&projectInfo";
        });
      }
    } else if (params.has("projectInfo")) {
      console.log("proj");
      const project_id = params.get("projectId");
      if (project_id) {
        // populate project info page
        console.log("Project ID:  " + project_id);
        $("#dashboard-content").hide();
        $("#settings-content").hide();
        $("#project-content").hide();
        $("#sproject-content").show();
        $("#sdeployment-content").hide();
        $("#serror-content").hide();

        // get project info
        const project_res = await fetch(
          "/api/projects/" +
            project_id +
            "?session_id=" +
            localStorage.getItem("session_id"),
        );
        const project = await project_res.json();
        if (project.success) {
          // populate project info page
          const project = projects.find((p) => p.id == project_id);
          $("#sproject-name").text(project.name);
          $("#sproject-description").text(project.description);
          $(".sproject-color-picker").css("background-color", project.color);
          const create_date = new Date(project.created_at);
          $("#sproject-createdate").text(
            `${create_date.getMonth() + 1}/${create_date.getDate()}/${create_date.getFullYear()}`,
          );

          let unresolved_errors = 0;
          let newerrors = 0;
          let latest_time = null;
          let active_deployments = 0;
          let inactive_deployments = 0;
          let timeline = [0, 0, 0, 0, 0, 0];
          let labels = [];
          for (let i = 5; i >= 0; i--) {
            const time = new Date(Date.now() - i * 4 * 60 * 60 * 1000);
            const hours = time.getHours();
            const suffix = hours >= 12 ? "pm" : "am";
            labels.push(((hours + 11) % 12) + 1 + " " + suffix);
          }
          const ctx = document.getElementById("sproject-timeline");
          const timelineChart = new Chart(
            ctx,
            JSON.parse(JSON.stringify(config)),
          );

          for (let j = 0; j < project.deployments.length; j++) {
            if (project.deployments[j].status == "active") {
              active_deployments += 1;
            } else {
              inactive_deployments += 1;
            }
            const deployment = project.deployments[j];
            let deployment_unresolved = 0;
            for (
              let k = 0;
              k < project.deployments[j].error_events.length;
              k++
            ) {
              if (
                project.deployments[j].error_events[k].status !== "resolved"
              ) {
                unresolved_errors += 1;
                deployment_unresolved += 1;
              }
              const event_time = parseSqlTimestamp(
                project.deployments[j].error_events[k].timestamp,
              );
              const now = new Date();
              const hours_before = (now - event_time) / 1000 / 60 / 60;
              if (hours_before < 24) {
                newerrors += 1;
                timeline[5 - Math.floor(hours_before / 4)] += 1;
              }
              if (latest_time == null) {
                latest_time = project.deployments[j].error_events[k].timestamp;
              } else if (event_time > parseSqlTimestamp(latest_time)) {
                latest_time = project.deployments[j].error_events[k].timestamp;
              }
            }
            const last_deployed = parseSqlTimestamp(deployment.last_deployed);

            $("#sproject-dlist").append(`
              <div class="dproject-card" id="sproject-${project.id}-${deployment.id}">
                <div class="dproject-info-item">
                  <h1>${deployment.name}</h1>
                  <div class="dproject-status ${deployment.status}">
                    <p>${deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}</p>
                  </div>
                  <div class="dproject-status ${deployment.environment}">
                    <p>${deployment.environment.charAt(0).toUpperCase() + deployment.environment.slice(1)}</p>
                  </div>
                </div>
                <div class="dproject-info">
                  <div class="dproject-info-item">
                    <i class="ph ph-warning"></i>
                    <p>${deployment_unresolved} Unresolved Errors</p>
                  </div>
                  <p class="dproject-divider">/</p>
                  <div class="dproject-info-item">
                    <i class="ph ph-clock"></i>
                    <p>Active since ${last_deployed.getMonth() + 1}/${last_deployed.getDate()}/${last_deployed.getFullYear()}</p>
                  </div>
                </div>
              </div>
              <hr />
            `);
            $("#sproject-" + project.id + "-" + deployment.id).click(
              function () {
                console.log("deployment " + deployment.id);
                window.location.href =
                  "/dashboard.html?deploymentInfo&deploymentId=" +
                  deployment.id;
              },
            );
          }
          timelineChart.data.datasets[0].data = timeline;
          timelineChart.data.labels = labels;
          timelineChart.data.datasets[0].backgroundColor = project.color;
          timelineChart.update();

          $("#sproject-unresolvedissues").text(unresolved_errors);
          $("#sproject-newissues").text(newerrors);
          $("#sproject-lasterror").text(
            latest_time == null ? "No errors found" : formatTime(latest_time),
          );
          $("#sproject-activedeployments").text(active_deployments);
          $("#sproject-inactivedeployments").text(inactive_deployments);

          // $("#sproject-createdate")
        } else {
          // redirect for now
          window.location.href = "/dashboard.html?projectOverview";
        }
      } else {
        // redirect bcs no project id
        window.location.href = "/dashboard.html";
      }
    } else if (params.has("deploymentInfo")) {
      $("#dashboard-content").hide();
      $("#settings-content").hide();
      $("#sproject-content").hide();
      $("#project-content").hide();
      $("#sdeployment-content").show();
      $("#serror-content").hide();

      const deployment_id = params.get("deploymentId");
      const project = projects.find((p) =>
        p.deployments.find((d) => d.id == deployment_id),
      );
      const deployment = project.deployments.find((d) => d.id == deployment_id);

      let checked_errors = [];
      let current_filtering = deployment.error_events.map((e) => e.id);

      if (deployment) {
        // populate deployment info page
        $("#sdeployment-name").text(deployment.name);
        $("#sdeployment-version").text(deployment.version);
        $("#sdeployment-environment").text(
          deployment.environment.charAt(0).toUpperCase() +
            deployment.environment.slice(1),
        );
        $("#sdeployment-environment-div").addClass(deployment.environment);

        $("#sdeployment-status").text(
          deployment.status.charAt(0).toUpperCase() +
            deployment.status.slice(1),
        );
        $("#sdeployment-status-div").addClass(deployment.status);

        const last_deployed = parseSqlTimestamp(deployment.last_deployed);
        $("#sdeployment-lastdeployed").text(
          last_deployed.getMonth() +
            1 +
            "/" +
            last_deployed.getDate() +
            "/" +
            last_deployed.getFullYear(),
        );

        const created_at = parseSqlTimestamp(deployment.created_at);
        $("#sdeployment-createdon").text(
          created_at.getMonth() +
            1 +
            "/" +
            created_at.getDate() +
            "/" +
            created_at.getFullYear(),
        );

        $("#sdeployment-parentproject").text(project.name);
        $("#sdeployment-apikey").text(deployment.api_key);

        // event statistics + timeline area
        $("#sdeployment-totalerrors").text(deployment.error_events.length);
        const unresolved_errors = deployment.error_events.filter(
          (e) => e.status !== "resolved",
        ).length;
        $("#sdeployment-unresolvederrors").text(unresolved_errors);

        let timeline = [0, 0, 0, 0, 0, 0];

        let latest_time = null;
        for (let i = 0; i < deployment.error_events.length; i++) {
          const event_time = parseSqlTimestamp(
            deployment.error_events[i].timestamp,
          );
          if (latest_time == null) {
            latest_time = deployment.error_events[i].timestamp;
          } else if (event_time > parseSqlTimestamp(latest_time)) {
            latest_time = deployment.error_events[i].timestamp;
          }

          const now = new Date();
          const hours_before = (now - event_time) / 1000 / 60 / 60;
          if (hours_before < 24) {
            timeline[5 - Math.floor(hours_before / 4)] += 1;
          }
        }
        $("#sdeployment-lasterror").text(
          latest_time == null ? "No errors found" : formatTime(latest_time),
        );

        let labels = [];
        for (let i = 5; i >= 0; i--) {
          const time = new Date(Date.now() - i * 4 * 60 * 60 * 1000);
          const hours = time.getHours();
          const suffix = hours >= 12 ? "pm" : "am";
          labels.push(((hours + 11) % 12) + 1 + " " + suffix);
        }

        // create timeline chart
        const ctx = document.getElementById("sdeployment-timeline");
        const timelineChart = new Chart(
          ctx,
          JSON.parse(JSON.stringify(config)),
        );
        timelineChart.data.datasets[0].data = timeline;
        timelineChart.data.labels = labels;
        timelineChart.data.datasets[0].backgroundColor = project.color;
        timelineChart.update();

        // populate error events table
        function populateErrorTable(options) {
          // options is text
          $("#sdeployment-elist").html("");
          let filtered_events = deployment.error_events;

          if (options.includes("status:unresolved")) {
            filtered_events = filtered_events.filter(
              (e) => e.status !== "resolved",
            );
            options = options.replace("status:unresolved", "");
          }

          if (options.includes("status:resolved")) {
            filtered_events = filtered_events.filter(
              (e) => e.status === "resolved",
            );
            options = options.replace("status:resolved", "");
          }

          filtered_events = filtered_events.filter((e) =>
            e.title.toLowerCase().includes(options),
          );

          current_filtering = filtered_events.map((e) => e.id);

          for (let i = 0; i < filtered_events.length; i++) {
            const event = filtered_events[i];
            const created_at = parseSqlTimestamp(event.timestamp);
            $("#sdeployment-elist").append(`
              <div class="sdeployment-card" id="errorevent-${event.id}">

                <div class="sdeployment-info-item">
                  <div class="checkbox ${checked_errors.includes(event.id) ? "checked" : ""}" id="checkbox-${event.id}" >
                    <i class="ph ph-check"></i>
                  </div>
                  <h1>${event.title}</h1>
                  <div class="dproject-status ${event.status}">
                    <p>${event.status.charAt(0).toUpperCase() + event.status.slice(1)}</p>
                  </div>
                </div>
                <div class="sdeployment-info">
                  <div class="dproject-info-item">
                    <i class="ph ph-clock"></i>
                    <p>Created on ${created_at.getMonth() + 1}/${created_at.getDate()}/${created_at.getFullYear()}</p>
                  </div>
                </div>
              </div>
              <hr />
            `);

            $("#checkbox-" + event.id).click(function () {
              if (checked_errors.includes(event.id)) {
                // remove from checked
                checked_errors = checked_errors.filter((id) => id !== event.id);
                $(this).removeClass("checked");
              } else {
                checked_errors.push(event.id);
                $(this).addClass("checked");
              }
              console.log(checked_errors);
            });

            $("#errorevent-" + event.id).click(function () {
              window.location.href =
                "/dashboard.html?errorEventInfo&eventId=" + event.id;
            });
          }
        }
        populateErrorTable($("#error-search").val().toLowerCase());
        $("#error-search").on("input", function () {
          populateErrorTable($(this).val().toLowerCase());
        });

        $("#elist-select").click(function () {
          // check if not all current selected
          if (checked_errors.length < current_filtering.length) {
            // select all
            checked_errors = [...current_filtering];
            current_filtering.forEach((id) => {
              $("#checkbox-" + id).addClass("checked");
            });
            $(this).addClass("checked");
          } else {
            // deselect all
            checked_errors = [];
            current_filtering.forEach((id) => {
              $("#checkbox-" + id).removeClass("checked");
            });
            $(this).removeClass("checked");
          }
        });

        $(".apikey-container").click(function () {
          $(this).toggleClass("show");
        });
      } else {
        // redirect bcs not a valid deployment
        window.location.href = "/dashboard.html";
      }
    } else if (params.has("errorEventInfo")) {
      $("#dashboard-content").hide();
      $("#project-content").hide();
      $("#sproject-content").hide();
      $("#settings-content").hide();
      $("#sdeployment-content").hide();
      $("#serror-content").show();
      const event_id = params.get("eventId");

      let deployments = projects.map((p) => p.deployments).flat();
      let deployment = null;

      for (let i = 0; i < deployments.length; i++) {
        const d = deployments[i];
        const event = d.error_events.find((e) => e.id == event_id);
        if (event) {
          deployment = d;
          break;
        }
      }
      if (deployment != null) {
        const event = deployment.error_events.find((e) => e.id == event_id);
        $("#serror-title").text(event.title);
        $("#serror-status-div").addClass(event.status);
        $("#serror-status").text(
          event.status.charAt(0).toUpperCase() + event.status.slice(1),
        );
        $("#serror-environment").text(
          event.environment.charAt(0).toUpperCase() +
            event.environment.slice(1),
        );
        $("#serror-deployment").text(deployment.name);
        const created_at = parseSqlTimestamp(event.timestamp);
        $("#serror-createdon").text(
          created_at.getMonth() +
            1 +
            "/" +
            created_at.getDate() +
            "/" +
            created_at.getFullYear(),
        );
        $("#serror-stacktrace").text(String(event.stack_trace).trim());
      } else {
        // not a valid event -> redirect
        window.location.href = "/dashboard.html";
      }
    } else if (params.has("settings")) {
      // show settings
      console.log("settings");
      $("#dashboard-content").hide();
      $("#project-content").hide();
      $("#sproject-content").hide();
      $("#settings-content").show();
      $("#sdeployment-content").hide();
      $("#serror-content").hide();
    } else {
      // dashboard overview
      $("#dashboard-content").show();
      $("#project-content").hide();
      $("#sproject-content").hide();
      $("#settings-content").hide();
      $("#sdeployment-content").hide();
      $("#serror-content").hide();

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
      let timelineData = []; // representing hours before now
      for (let i = 0; i < 6; i++) {
        timelineData.push(0); // four hour intervals
      }
      let datasets = [];
      for (let i = 0; i < projects.length; i++) {
        datasets.push({
          label: projects[i].name,
          data: [0, 0, 0, 0, 0, 0],
          backgroundColor: projects[i].color,
          borderColor: "#000000",
          borderWidth: 2,
          borderSkipped: false,
          borderRadius: 3,
        });
        for (let j = 0; j < projects[i].deployments.length; j++) {
          const error_events = projects[i].deployments[j].error_events;
          for (let k = 0; k < error_events.length; k++) {
            const event_time = parseSqlTimestamp(error_events[k].timestamp);
            const now = new Date();
            const hours_before = (now - event_time) / 1000 / 60 / 60;
            console.log("Hours before: " + hours_before);
            if (hours_before < 24) {
              datasets[i].data[5 - Math.floor(hours_before / 4)] += 1;
            }
          }
        }
      }
      dashboardTimeline.data.datasets = datasets;
      dashboardTimeline.update();

      // labels
      let labels = [];
      for (let i = 5; i >= 0; i--) {
        const time = new Date(Date.now() - i * 4 * 60 * 60 * 1000);
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

        const now = new Date();
        const new_errors = deployment.error_events.filter((e) => {
          const event_time = parseSqlTimestamp(e.timestamp);
          return (
            (now - event_time) / (1000 * 60 * 60) < 24 &&
            e.status !== "resolved"
          ); // 24 hours is the threshhold for now
        });
        console.log(new_errors);
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
                        <p>+${new_errors.length}</p>
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
        <div class="dproject-card" id="dproject-${projects[i].id}">
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
        $("#dproject-" + projects[i].id).click(function () {
          window.location.href =
            "/dashboard.html?projectId=" + projects[i].id + "&projectInfo";
        });
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
