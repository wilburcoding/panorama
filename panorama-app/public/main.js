$(document).ready(function () {
  let projects = [];
  let user = {};
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

    // get deployments for each project
    let pids = "";
    for (let i = 0; i < projects.length; i++) {
      pids += projects[i].id + ",";
    }
    pids = pids.slice(0, -1); // extra comma at end
    if (pids.length === 0) {
      pids = "null";
    }
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

    // populate sidebar project list
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const project_id = project.id;
      $("#sidebar-plist").append(`
            <button class="sidebar-project" id="sbp-${project_id}">
                <div class="project-color" id="sbp-${project_id}-color" style="background-color: ${project.color}"></div>
                <p id="sbp-${project_id}-name">${project.name}</p>
            </button>`);
      for (let j = 0; j < project.deployments.length; j++) {
        $("#sidebar-plist").append(`
          <button class="sidebar-project deployment" id="sbp-${project_id}-${project.deployments[j].id}">
            <i class="ph ph-cloud"></i>
            <p id="sbp-${project_id}-${project.deployments[j].id}-name">${project.deployments[j].name}</p>
          </button>
          <div id="sbp-${project_id}-${project.deployments[j].id}-tabs" style="width: 100%;"></div>
          `);
        const deployment = project.deployments[j];
        const deployment_id = deployment.id;
        $("#sbp-" + project_id + "-" + deployment_id).click(function () {
          window.location.href =
            "/dashboard.html?deploymentId=" + deployment_id + "&deploymentInfo";
        });
      }
      $("#sbp-" + project_id).click(function () {
        window.location.href =
          "/dashboard.html?projectId=" + project.id + "&projectInfo";
      });
    }
    // get error events for each deploymentx
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
        // console.log(deployment);
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
          user = json.user;
          loadData().then(() => {
            checkPage();
          });
        }
      });
  }
  $("#edit-modal-container").hide();
  $("#elist-delete").attr("disabled", true);
  $("#elist-update").attr("disabled", true);
  // handle modals
  function openModal(options) {
    return new Promise((resolve, reject) => {
      $("#edit-modal-container").show();
      $("#edit-modal-content").html(
        `<h1 id="modal-title">Edit Project Details</h1>`,
      );
      $("#modal-title").text(options.title);
      for (let i = 0; i < options.fields.length; i++) {
        const field = options.fields[i];
        // field data: placeholder, value (text/textarea), options (select), label (label of field), type (text/textarea/select), id (for when data is returned)
        // for select, options is array of {label, value}

        if (field.type === "text") {
          $("#edit-modal-content").append(`
        <p class="modal-label">${field.label}</p>
        <input type="text" placeholder="${field.placeholder}" value="${field.value}"  id="modal-item-${field.id}"/>
      `);
        } else if (field.type == "textarea") {
          $("#edit-modal-content").append(`
          <p class="modal-label">${field.label}</p>
          <textarea placeholder="${field.placeholder}" id="modal-item-${field.id}">${field.value}</textarea>
        `);
        } else if (field.type == "password") {
          $("#edit-modal-content").append(`
            <p class="modal-label">${field.label}</p>
            <input type="password" placeholder="${field.placeholder}" id="modal-item-${field.id}"/>
          `);
        } else if (field.type == "select") {
          let options_html = "";
          for (let j = 0; j < field.options.length; j++) {
            const option = field.options[j];
            options_html += `<option value="${option.value}" ${option.value === field.value ? "selected" : ""}>${option.label}</option>`;
          }

          $("#edit-modal-content").append(`
            <p class="modal-label">${field.label}</p>
            <select id="modal-item-${field.id}">
            ${options_html}
            </select>
          `);
        } else if (field.type == "color") {
          $("#edit-modal-content").append(`
            <p class="modal-label">${field.label}</p>
            <input type="color" id="modal-item-${field.id}" value="${field.value}">
          `);
        } else if (field.type == "checkbox") {
          console.log(field.value);
          $("#edit-modal-content").append(`
            <p class="modal-label">${field.label}</p>
            <div class="checkbox ${field.value ? "checked" : ""}" id="modal-item-${field.id}">
            <i class="ph ph-check"></i>
            </div>`);
          $("#modal-item-" + field.id).on("click", function () {
            $(this).toggleClass("checked");
          });
        }
      }
      $("#edit-modal-content").append(`
        <div style="display:flex;justify-content: flex-start;">
        <button id="modal-cancel" style="margin-right:15px;">Cancel</button>
        <button id="modal-save">Save</button>
        </div>`);
      $("#edit-modal-content").append(`<p id="error-message"></p>`);
      $("#modal-save").off("click");
      let return_data = {};
      $("#modal-save").click(function () {
        let data = {};
        for (let i = 0; i < options.fields.length; i++) {
          const field = options.fields[i];
          if (options.fields[i].type == "checkbox") {
            data[field.id] = $("#modal-item-" + field.id).hasClass("checked");
          } else {
            data[field.id] = $("#modal-item-" + field.id).val();
          }
        }

        // validate data -> use custom validation functions if provided
        for (let key in data) {
          if (options.fields.find((f) => f.id === key).validate) {
            const validate_function = options.fields.find(
              (f) => f.id === key,
            ).validate;
            let func_result = "";
            if (
              options.fields.find((f) => f.id === key).id == "confirm_password"
            ) {
              func_result = validate_function(data[key], data["new_password"]);
            } else {
              func_result = validate_function(data[key]);
            }
            if (func_result.success === false) {
              $("#error-message").text(func_result.message);
              return;
            }
          }
        }

        return_data = data;
        $("#error-message").text("");
        $("#edit-modal-container").hide();
        resolve(return_data);
      });

      $("#modal-cancel").click(function () {
        $("#error-message").text("");
        $("#edit-modal-container").hide();
        reject();
      });
    });
  }

  // openModal({fields: [{id: "name", label: "Project Name", type: "text", placeholder:"Enter project name", value:"Sample Project 1"}], title: "Edit Project Details"}).then((data) => {
  //   console.log(data);
  // })
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
      $("#sbp-overview").addClass("active");
      $("#dashboard-content").hide();
      $("#settings-content").hide();
      $("#sproject-content").hide();
      $("#project-content").show();
      $("#serror-overview-content").hide();
      $("#sdeployment-overview-content").hide();
      $("#sdeployment-errors-content").hide();
      $("#sdeployment-performance-content-1").hide();
      $("#sdeployment-performance-content-2").hide();
      $("#sdeployment-uptime-content").hide();
      $("#sdeployment-settings-content").hide();
      $("#smonitor-content").hide();

      for (let i = 0; i < projects.length; i++) {
        let project = projects[i];
        const create_date = parseSqlTimestamp(project.created_at);
        let chours = create_date.getHours() % 12;
        let cminutes = create_date.getMinutes().toString().padStart(2, "0");
        let csuffix = create_date.getHours() >= 12 ? "PM" : "AM";

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
              <p class="project-card-create">Created on ${create_date.getMonth() + 1}/${create_date.getDate()}/${create_date.getFullYear()} at ${chours}:${cminutes} ${csuffix}</p>
              <h2 class="project-card-sectionh" style="margin-top: 20px">
                Description
              </h2>

              <p class="main-p" style="height:40px; max-height: 40px;text-overflow: ellipsis;overflow:hidden;max-width: 100%;">
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
      $("#project-overview-content").append(`
        <div class="dashboard-card project-overview-card"
          style="width: 45%; padding: 0;min-height: 300px;" id="project-overview-newproject"
        >
          <div style="padding: 20px;width:100%;box-sizing: border-box; display:flex; align-items: center;justify-content: center; flex-direction:column;height:100%;">
          <i class="ph ph-plus" style="font-size: 60px;margin-top:10px;"></i>
          </div>
        </div>
      `);

      $("#project-overview-newproject").click(function () {
        openModal({
          title: "Create New Project",
          fields: [
            {
              id: "name",
              label: "Project Name",
              type: "text",
              placeholder: "",
              value: "",
              validate: (value) => {
                if (value.length < 2) {
                  return {
                    success: false,
                    message: "Project name must be at least 2 characters long",
                  };
                }
                if (value.length > 30) {
                  return {
                    success: false,
                    message: "Project name can be at most 30 characters long",
                  };
                }
                return {
                  success: true,
                };
              },
            },
            {
              id: "description",
              label: "Project Description",
              type: "textarea",
              placeholder: "",
              value: "",
              validate: (value) => {
                if (value.length > 100) {
                  return {
                    success: false,
                    message:
                      "Project description can be at most 200 characters long",
                  };
                }
                return {
                  success: true,
                };
              },
            },
            {
              id: "color",
              label: "Project Color",
              type: "color",
              value: "#4aa2bb",
            },
          ],
        }).then((data) => {
          fetch("/api/projects", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: data.name,
              description: data.description,
              color: data.color,
              session_id: localStorage.getItem("session_id"),
            }),
          })
            .then((resp) => resp.json())
            .then((json) => {
              // console.log(json);
              if (json.success) {
                window.location.href =
                  "/dashboard.html?projectId=" +
                  json.project.id +
                  "&projectInfo";
              }
            });
        });
      });
    } else if (params.has("monitorInfo")) {
      // individual monitor details page - TODO
      const monitor_id = params.get("monitorId");
      const deployment_id = params.get("deploymentId");
      const project_id = params.get("projectId");

      if (monitor_id && deployment_id && project_id) {
        $("#dashboard-content").hide();
        $("#settings-content").hide();
        $("#project-content").hide();
        $("#sproject-content").hide();
        $("#sdeployment-overview-content").hide();
        $("#sdeployment-errors-content").hide();
        $("#sdeployment-performance-content-1").hide();
        $("#sdeployment-performance-content-2").hide();
        $("#sdeployment-uptime-content").hide();
        $("#sdeployment-settings-content").hide();
        $("#serror-overview-content").hide();
        $("#smonitor-content").show();

        // get monitor info

        const project = projects.find((p) => p.id == project_id);
        if (!project) {
          window.location.href = "/dashboard.html";
        }

        const deployment = project.deployments.find(
          (d) => d.id == deployment_id,
        );
        if (!deployment) {
          window.location.href = "/dashboard.html";
        }
        $("#sbp-" + project.id).addClass("active");

        // populate tabs
        const icons = [
          "ph-house",
          "ph-warning",
          "ph-speedometer",
          "ph-cloud-check",
          "ph-gear",
        ];
        const tab_names = [
          "Overview",
          "Errors",
          "Performance",
          "Uptime",
          "Settings",
        ];
        for (let i = 0; i < tab_names.length; i++) {
          const tabname = tab_names[i];
          const icon = icons[i];
          $("#sbp-" + project.id + "-" + deployment.id + "-tabs").append(`
          <button class="sidebar-project tab" id="sbp-${project.id}-${deployment.id}-${tabname.toLowerCase()}">
            <i class="ph ${icon}"></i>
            <p id="sbp-${project.id}-${deployment.id}-tab-${tabname.toLowerCase()}">${tabname}</p>
          </button>
            `);
          $(
            "#sbp-" +
              project.id +
              "-" +
              deployment.id +
              "-" +
              tabname.toLowerCase(),
          ).click(function () {
            window.location.href =
              "/dashboard.html?deploymentId=" +
              deployment.id +
              "&deploymentInfo&currentTab=" +
              tabname.toLowerCase();
          });
        }

        $(
          "#sbp-" + project.id + "-" + deployment.id + "-uptime",
        ).addClass("active");
        $("#sbp-" + project.id + "-" + deployment.id).addClass("active");


        const meta = JSON.parse(deployment.meta);
        const monitor = meta.uptime.monitors.find((m) => m.id == monitor_id);
        if (!monitor) {
          window.location.href = "/dashboard.html";
        }

        // populate monitor info page
        console.log(monitor.active)
        $("#monitor-url").text(monitor.url);
        $("#monitor-status").removeClass("active");
        $("#monitor-status").removeClass("inactive");
        $("#monitor-status").addClass(monitor.active ? "active" : "inactive");
        $("#monitor-status-text").text(monitor.active ? "Active" : "Inactive");
        $("#monitor-parent").text(deployment.name);
        $("#monitor-id").text(monitor.id);
        if (monitor.timestamps.length > 0) {
          const last_check = parseSqlTimestamp(
            monitor.timestamps[monitor.timestamps.length - 1],
          );
          let hours = last_check.getHours() % 12;
          if (hours === 0) {
            hours = 12;
          }
          let suffix = last_check.getHours() >= 12 ? "PM" : "AM";
          let minutes = last_check.getMinutes().toString().padStart(2, "0");
          $("#monitor-lastcheck").text(`
            ${last_check.getMonth() + 1}/${last_check.getDate()}/${last_check.getFullYear()} at ${hours}:${minutes} ${suffix}
          `);
        }
        $("#monitor-name").text(monitor.name);

        let response_data = [];
        for (let i = 0; i < monitor.timestamps.length; i++) {
          response_data.push({
            x: parseSqlTimestamp(monitor.timestamps[i]),
            y: monitor.response_times[i],
          });
        }
        const ctx = document.getElementById("monitor-response-chart");
        const responseChart = new Chart(
          ctx,
          JSON.parse(JSON.stringify(config)),
        );
        responseChart.config.type = "scatter";
        responseChart.data.datasets = [
          {
            label: "Response Time (ms)",
            data: response_data,
            backgroundColor: "rgb(147, 140, 245)",
            borderColor: "#000000",
            borderWidth: 1,
            borderSkipped: false,
            borderRadius: 3,
          },
        ];

        responseChart.options.scales.x = {
          type: "time",
          time: {
            unit: "hour",
            displayFormats: {
              hour: "h:mm a",
            }
          },
          min: (() => {
            const d = new Date();
            d.setHours(d.getHours() - 72);
            return d;
          })(),
          max: new Date()
        };

        responseChart.options.scales.x.ticks = {
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false,
          callback: (value) => {
            const date = new Date(value);
            let label = "";
            if (date.getHours() === 0 && date.getMinutes() === 0) {
              return date.getMonth() + 1 + "/" + date.getDate();
            }
            return null;
          },
        };

        let response_sum = 0;
        for (let i =0; i < response_data.length; i++) {
          response_sum += response_data[i].y;
        }
        let annotations = {};
        const avg = response_sum == 0 ? 0 : response_sum / response_data.length;
        console.log(avg);
        if (avg > 0) {
          annotations["avgline"] = {
            type: "line",
            scaleID:"y",
            value: avg,
            borderColor: "rgb(147, 140, 245)",
            borderWidth: 2,
            borderDash: [6, 6],
            label: {
              display: true,
              content: "Average: " + avg.toFixed(2) + " ms",
              position: "start",
              backgroundColor: "rgba(56, 56, 56, 0.7)",
              color: "#ffffff",
              font: {
                size: 12,
              }
            }

          }
        }
        responseChart.options.plugins.annotation = {
          annotations: annotations,
        };
        responseChart.update();

        // uptime chart -> usling sline
        let uptime_sum = [];
        let uptime_count = [];
        for (let i =0; i < 72; i++) {
          uptime_sum.push(0);
          uptime_count.push(0);

        }
        for (let i =0; i < monitor.statuses.length; i++) {
          const status = monitor.statuses[i];
          const time = parseSqlTimestamp(monitor.timestamps[i]);
          const hours_before = (new Date() - time) / 1000 / 60/60;
          if (hours_before < 72) {
            if (status) {
              uptime_sum[Math.floor(72 - hours_before)] += 1;
            }
            uptime_count[Math.floor(72 - hours_before)] += 1;

          }
        }

        let str = "";
        for (let i = 0; i < uptime_sum.length; i++) {
          if (uptime_count[i] === 0) {
            str+=`<div class="monitoring-sline unknown"></div>`;
          } else {
            const percent = uptime_sum[i] / uptime_count[i];
            if (percent > 0.65) {
              str+=`<div class="monitoring-sline up"></div>`;
            } else if (percent > 0.35) {
              str+=`<div class="monitoring-sline degraded"></div>`;
            } else {
              str+=`<div class="monitoring-sline down"></div>`;
            }
          }
        }
        $("#monitor-uptime-container").html(str);
        

        let uptime_daily = "";
        for (let i =0; i < 90; i++) {
          const value = monitor.daily_timeline[i];
          if (value === null) {
            uptime_daily+=`<div class="monitoring-sline unknown"></div>`;
          } else if (value > 0.65) {
            uptime_daily+=`<div class="monitoring-sline up"></div>`;
          } else if (value > 0.35) {
            uptime_daily += `<div class="monitoring-sline degraded"></div>`;
          } else {
            uptime_daily += `<div class="monitoring-sline down"></div>`;
          }
        }
        $("#monitor-duptime-container").html(uptime_daily);

        // TODO: editing monitor options + deleting monitors
        $("#monitor-edit").click(function() {
          console.log(monitor.active);
          openModal({
            title: "Edit Monitor",
            fields: [
              {
                id: "name",
                label: "Monitor Name",
                type: "text",
                placeholder: "",
                value: monitor.name,
                validate: (value) => {
                  if (value.length < 2) {
                    return {
                      success: false,
                      message: "Monitor name must be at least 2 characters long"
                    }
                  }
                  return {
                    success: true,
                  }
                }
              },
              {
                id: "url",
                label: "Monitor URL",
                type: "text",
                placeholder: "",
                value: monitor.url,
                validate: (value) => {
                  try {
                    new URL(value);
                    return {
                      success: true,
                    }
                  } catch (e) {
                    return {
                      success: false,
                      message: "Please enter a valid URL"
                    }
                  }
                }
              },
              {
                id: "active",
                label: "Status",
                type: "checkbox",
                value: monitor.active
              }
            ]
          }).then((data) => {
            fetch("/api/deployments/" + deployment.id + "/monitors/" + monitor.id, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                name: data.name,
                url: data.url,
                active: data.active
              })
            }).then((resp) => resp.json())
              .then((json) => {
                console.log(json);
                if (json.success) {
                  const updated_deployment = json.deployment;
                  console.log(updated_deployment);
                  const updated_meta = JSON.parse(updated_deployment.meta);
                  const updated_monitor = updated_meta.uptime.monitors.find((m) => m.id == monitor.id);
                  console.log(updated_monitor);
                  $("#monitor-url").text(updated_monitor.url);
                  $("#monitor-name").text(updated_monitor.name);
                  $("#monitor-status").removeClass("active")
                  $("#monitor-status").removeClass("inactive");
                  $("#monitor-status").addClass(updated_monitor.active ? "active" : "inactive");
                  $("#monitor-status-text").text(updated_monitor.active ? "Active" : "Inactive");
                }
              })
          })
        })

        $("#monitor-delete").click(function() {
          openModal({
            title: "Delete Monitor",
            fields: [
              {
                id: "confirm",
                label: "Confirm you want to delete this monitor (this is irreversible)",
                type: "checkbox",
                value: false,
              }
            ]
          }).then((data) => {
            if (data.confirm) {
              fetch("/api/deployments/" + deployment.id + "/monitors/" + monitor.id, {
                method: "DELETE"
              }).then((resp) => resp.json())
                .then((json) => {
                  if (json.success) {
                    window.location.href = "/dashboard.html?deploymentId=" + deployment.id + "&deploymentInfo&currentTab=uptime";
                  }
                })
            }
          })
        })


      } else {
        // redirect bcs no monitor id or no deployment id
        window.location.href = "/dashboard.html";
      }
    } else if (params.has("projectInfo")) {
      // individual project info page
      const project_id = params.get("projectId");
      if (project_id) {
        $("#sbp-" + project_id).addClass("active");
        // populate project info page
        $("#dashboard-content").hide();
        $("#settings-content").hide();
        $("#project-content").hide();
        $("#sproject-content").show();
        $("#sdeployment-overview-content").hide();
        $("#sdeployment-errors-content").hide();
        $("#sdeployment-performance-content-1").hide();
        $("#sdeployment-performance-content-2").hide();
        $("#sdeployment-uptime-content").hide();
        $("#sdeployment-settings-content").hide();
        $("#serror-overview-content").hide();
        $("#smonitor-content").hide();

        // get project info
        const project_res = await fetch(
          "/api/projects/" +
            project_id +
            "?session_id=" +
            localStorage.getItem("session_id"),
        );
        let project = await project_res.json();
        if (project.success) {
          // populate project info page
          let project = projects.find((p) => p.id == project_id);
          $("#sproject-name").text(project.name);
          $("#sproject-description").text(project.description);
          $(".sproject-color-picker").css("background-color", project.color);
          const create_date = parseSqlTimestamp(project.created_at);
          let hours = create_date.getHours() % 12;
          let minutes = create_date.getMinutes().toString().padStart(2, "0");
          let suffix = create_date.getHours() >= 12 ? "PM" : "AM";

          $("#sproject-createdate").text(
            `${create_date.getMonth() + 1}/${create_date.getDate()}/${create_date.getFullYear()} at ${hours}:${minutes} ${suffix}`,
          );

          let unresolved_errors = 0;
          let newerrors = 0;
          let latest_time = null;
          let active_deployments = 0;
          let inactive_deployments = 0;
          let unresolved_timeline = [0, 0, 0, 0, 0, 0];
          let resolved_timeline = [0, 0, 0, 0, 0, 0];
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
                if (
                  project.deployments[j].error_events[k].status !== "resolved"
                ) {
                  unresolved_timeline[5 - Math.floor(hours_before / 4)] += 1;
                } else {
                  resolved_timeline[5 - Math.floor(hours_before / 4)] += 1;
                }
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
                    <p>${deployment.last_deployed == null ? "Not deployed yet" : `Active since ${last_deployed.getMonth() + 1}/${last_deployed.getDate()}/${last_deployed.getFullYear()}`}</p>
                  </div>
                </div>
              </div>
              <hr />
            `);
            $("#sproject-" + project.id + "-" + deployment.id).click(
              function () {
                window.location.href =
                  "/dashboard.html?deploymentInfo&deploymentId=" +
                  deployment.id;
              },
            );
          }

          // project creation item
          $("#sproject-dlist").append(`
            <div class="dproject-card" id="sproject-newdeployment" style="justify-content: center">
              <div class="dproject-info">
              <i class="ph ph-plus" style="font-size: 20px;"></i>
              <p style="margin-top:5px;margin-bottom:5px;" >New Deployment</p>
              </div>
            </div>
            <hr />
          `);

          $("#sproject-newdeployment").click(function () {
            openModal({
              title: "Create New Deployment",
              fields: [
                {
                  id: "name",
                  label: "Deployment Name",
                  type: "text",
                  placeholder: "",
                  value: "",
                  validate: (value) =>
                    value.length > 1
                      ? { success: true }
                      : {
                          success: false,
                          message:
                            "Deployment name must be at least 2 characters long",
                        },
                },
                {
                  id: "version",
                  label: "Version",
                  type: "text",
                  placeholder: "",
                  value: "",
                  validate: (value) =>
                    value.length > 0
                      ? { success: true }
                      : { success: false, message: "Version must be provided" },
                },
                {
                  id: "environment",
                  label: "Environment",
                  type: "select",
                  options: [
                    { label: "Production", value: "production" },
                    { label: "Staging", value: "Staging" },
                    { label: "Development", value: "development" },
                  ],
                  value: "production",
                },
                {
                  id: "status",
                  label: "Status",
                  type: "select",
                  options: [
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                  ],
                  value: "active",
                },
              ],
            }).then((data) => {
              fetch("/api/deployments", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: data.name,
                  version: data.version,
                  environment: data.environment,
                  status: data.status,
                  project_id: project.id,
                }),
              });
            });
          });
          timelineChart.data.datasets = [
            {
              label: "Unresolved Errors",
              data: unresolved_timeline,
              backgroundColor: "rgb(245, 140, 140)",
              borderColor: "#000000",
              borderWidth: 2,
              borderSkipped: false,
              borderRadius: 3,
            },
            {
              label: "Resolved Errors",
              data: resolved_timeline,
              backgroundColor: "#7fd58f",
              borderColor: "#000000",
              borderWidth: 2,
              borderSkipped: false,
              borderRadius: 3,
            },
          ];
          // timelineChart.data.datasets.push({
          //   label: "Resolved Errors"
          // })
          timelineChart.data.labels = labels;
          timelineChart.update();

          $("#sproject-unresolvedissues").text(unresolved_errors);
          $("#sproject-newissues").text(newerrors);
          $("#sproject-lasterror").text(
            latest_time == null ? "No errors found" : formatTime(latest_time),
          );
          $("#sproject-activedeployments").text(active_deployments);
          $("#sproject-inactivedeployments").text(inactive_deployments);

          // $("#sproject-createdate")

          $("#sproject-edit").click(function () {
            openModal({
              title: "Edit Project Details",
              fields: [
                {
                  id: "name",
                  label: "Project Name",
                  type: "text",
                  placeholder: "",
                  value: project.name,
                  validate: (value) => {
                    if (value.length < 2) {
                      return {
                        success: false,
                        message:
                          "Project name must be at least 2 characters long",
                      };
                    }
                    if (value.length > 30) {
                      return {
                        success: false,
                        message:
                          "Project name can be at most 30 characters long",
                      };
                    }
                    return {
                      success: true,
                    };
                  },
                },
                {
                  id: "description",
                  label: "Project Description",
                  type: "textarea",
                  placeholder: "",
                  value: project.description,
                  validate: (value) => {
                    if (value.length > 200) {
                      return {
                        success: false,
                        message:
                          "Project description can be at most 200 characters long",
                      };
                    }
                    return {
                      success: true,
                    };
                  },
                },
                {
                  id: "color",
                  label: "Project Color",
                  type: "color",
                  value: project.color,
                },
              ],
            }).then((data) => {
              // console.log(data);
              fetch("/api/projects/" + project.id, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: data.name,
                  description: data.description,
                  color: data.color,
                }),
              })
                .then((resp) => resp.json())
                .then((json) => {
                  if (json.success) {
                    // update project info on page
                    $("#sproject-name").text(json.project.name);
                    $("#sproject-description").text(json.project.description);
                    $(".sproject-color-picker").css(
                      "background-color",
                      json.project.color,
                    );

                    timelineChart.data.datasets[0].backgroundColor =
                      json.project.color;
                    timelineChart.update();
                    $("#sbp-" + project.id + "-color").css(
                      "background-color",
                      json.project.color,
                    );
                    $("#sbp-" + project.id + "-name").text(json.project.name);
                    project.name = json.project.name;
                    project.description = json.project.description;
                    project.color = json.project.color;
                    projects[projects.findIndex((p) => p.id === project.id)] =
                      project;
                  }
                });
            });
          });

          // deleting project
          $("#sproject-delete").click(function () {
            openModal({
              title: "Delete Project",
              fields: [
                {
                  id: "confirm",
                  label:
                    "Confirm you want to delete this project (this action cannot be undone)",
                  type: "checkbox",
                },
              ],
            }).then((data) => {
              // console.log(data);
              if (data.confirm) {
                fetch("/api/projects/" + project.id, {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                  },
                })
                  .then((resp) => resp.json())
                  .then((json) => {
                    window.location.href = "/dashboard.html?projectOverview";
                  });
              }
            });
          });
        } else {
          // redirect for now
          window.location.href = "/dashboard.html?projectOverview";
        }
      } else {
        // redirect bcs no project id
        window.location.href = "/dashboard.html";
      }
    } else if (params.has("deploymentInfo")) {
      // individual deployment info page
      $("#dashboard-content").hide();
      $("#settings-content").hide();
      $("#sproject-content").hide();
      $("#project-content").hide();
      $("#sdeployment-overview-content").hide();
      $("#sdeployment-errors-content").hide();
      $("#sdeployment-performance-content-1").hide();
      $("#sdeployment-performance-content-2").hide();
      $("#sdeployment-uptime-content").hide();
      $("#sdeployment-settings-content").hide();
      $("#serror-overview-content").hide();
      $("#smonitor-content").hide();

      const deployment_id = params.get("deploymentId");
      const project = projects.find((p) =>
        p.deployments.find((d) => d.id == deployment_id),
      );
      $("#sbp-" + project.id).addClass("active");
      const deployment = project.deployments.find((d) => d.id == deployment_id);

      let checked_errors = [];
      let current_filtering = deployment.error_events.map((e) => e.id);

      if (deployment) {
        // populate deployment info page

        // populate tabs
        const icons = [
          "ph-house",
          "ph-warning",
          "ph-speedometer",
          "ph-cloud-check",
          "ph-gear",
        ];
        const tab_names = [
          "Overview",
          "Errors",
          "Performance",
          "Uptime",
          "Settings",
        ];
        for (let i = 0; i < tab_names.length; i++) {
          const tabname = tab_names[i];
          const icon = icons[i];
          $("#sbp-" + project.id + "-" + deployment.id + "-tabs").append(`
          <button class="sidebar-project tab" id="sbp-${project.id}-${deployment.id}-${tabname.toLowerCase()}">
            <i class="ph ${icon}"></i>
            <p id="sbp-${project.id}-${deployment.id}-tab-${tabname.toLowerCase()}">${tabname}</p>
          </button>
            `);
          $(
            "#sbp-" +
              project.id +
              "-" +
              deployment.id +
              "-" +
              tabname.toLowerCase(),
          ).click(function () {
            window.location.href =
              "/dashboard.html?deploymentId=" +
              deployment.id +
              "&deploymentInfo&currentTab=" +
              tabname.toLowerCase();
          });
        }

        // get current tab from url
        let currentTab = params.get("currentTab");
        if (currentTab == null) {
          currentTab = "overview";
        }
        if (
          !["overview", "errors", "performance", "uptime", "settings"].includes(
            currentTab,
          )
        ) {
          currentTab = "overview";
        }
        $(
          "#sbp-" + project.id + "-" + deployment.id + "-" + currentTab,
        ).addClass("active");
        $("#sbp-" + project.id + "-" + deployment.id).addClass("active");

        if (currentTab !== "performance") {
          $("#sdeployment-" + currentTab + "-content").show();
        } else {
          console.log(deployment.type);
          if (deployment.type === "backend") {
            $("#sdeployment-performance-content-1").show();
            $("#sdeployment-performance-content-2").hide();
          } else {
            $("#sdeployment-performance-content-2").show();
            $("#sdeployment-performance-content-1").hide();
          }
        }

        if (currentTab === "overview") {
          // populate basic deployment details (name, version, environment, status, last deployed, created on , parent project, api key)

          
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

          if (deployment.last_deployed) {
            const last_deployed = parseSqlTimestamp(deployment.last_deployed);
            $("#sdeployment-lastdeployed").text(
              last_deployed.getMonth() +
                1 +
                "/" +
                last_deployed.getDate() +
                "/" +
                last_deployed.getFullYear(),
            );
          } else {
            $("#sdeployment-lastdeployed").text("N/A");
          }

          const created_at = parseSqlTimestamp(deployment.created_at);
          let hours = created_at.getHours() % 12;
          let minutes = created_at.getMinutes().toString().padStart(2, "0");
          let suffix = created_at.getHours() >= 12 ? "PM" : "AM";
          $("#sdeployment-createdon").text(
            created_at.getMonth() +
              1 +
              "/" +
              created_at.getDate() +
              "/" +
              created_at.getFullYear() +
              " at " +
              hours +
              ":" +
              minutes +
              " " +
              suffix,
          );

          $("#sdeployment-parentproject").text(project.name);
          $("#sdeployment-apikey").text(deployment.api_key);
          $("#sdeployment-type").text(
            deployment.type.charAt(0).toUpperCase() + deployment.type.slice(1),
          );
          $(".apikey-container").click(function () {
            $(this).toggleClass("show");
          });

          // errors info row
          const ctx = document.getElementById("sdeployment-etimeline-chart");
          const timelineChart = new Chart(
            ctx,
            JSON.parse(JSON.stringify(config)),
          );
          let unresolved_timeline = [0, 0, 0, 0, 0, 0];
          let resolved_timeline = [0, 0, 0, 0, 0, 0];
          let labels = [];
          for (let i = 5; i >= 0; i--) {
            const time = new Date(Date.now() - i * 4 * 60 * 60 * 1000);
            const hours = time.getHours();
            const suffix = hours >= 12 ? "pm" : "am";
            labels.push(((hours + 11) % 12) + 1 + " " + suffix);
          }

          for (let i = 0; i < deployment.error_events.length; i++) {
            const event_time = parseSqlTimestamp(
              deployment.error_events[i].timestamp,
            );
            const now = new Date();
            const hours_before = (now - event_time) / 1000 / 60 / 60;
            if (hours_before < 24) {
              if (deployment.error_events[i].status !== "resolved") {
                unresolved_timeline[5 - Math.floor(hours_before / 4)] += 1;
              } else {
                resolved_timeline[5 - Math.floor(hours_before / 4)] += 1;
              }
            }
          }

          timelineChart.data.datasets = [
            {
              label: "Unresolved Errors",
              data: unresolved_timeline,
              backgroundColor: "rgb(245, 140, 140)",
              borderColor: "#000000",
              borderWidth: 2,
              borderSkipped: false,
              borderRadius: 3,
            },
            {
              label: "Resolved Errors",
              data: resolved_timeline,
              backgroundColor: "#7fd58f",
              borderColor: "#000000",
              borderWidth: 2,
              borderSkipped: false,
              borderRadius: 3,
            },
          ];
          timelineChart.data.labels = labels;
          timelineChart.update();

          // recent errors table
          sdeployment_recent_errors = deployment.error_events;
          sdeployment_recent_errors.sort(
            (a, b) =>
              parseSqlTimestamp(b.timestamp) - parseSqlTimestamp(a.timestamp),
          );
          sdeployment_recent_errors = sdeployment_recent_errors.slice(0, 5);
          for (let i = 0; i < sdeployment_recent_errors.length; i++) {
            const event = sdeployment_recent_errors[i];
            const created_at = parseSqlTimestamp(event.timestamp);
            const formatted_time = formatTime(event.timestamp);
            $("#sdeployment-rerror-container").append(`
              <div class="sdeployment-rerror-card">
                <h1>Something</h1>
                <h2>5 minutes ago</h2>
              </div>
              <hr/> 
              `);
          }

          const meta = JSON.parse(deployment.meta);
          if (meta) {
            const backend_monitoring = meta.performance.backend_monitoring;
            const cpu = backend_monitoring.cpu_usage;
            const memory = backend_monitoring.memory_usage;
            const timestamps = backend_monitoring.timestamps;
            // populate charts for cpu and memory usage -> group by minute for at max 2 hours
            let labels = [];
            let cpu_data = [];
            let memory_data = [];
            for (let i = 120; i >= 0; i--) {
              const time = new Date(Date.now() - i * 60 * 1000);
              let hours = time.getHours();
              if (hours > 12) {
                hours = hours - 12;
              }
              const suffix = time.getHours() >= 12 ? "pm" : "am";
              labels.push(
                `${hours}:${time.getMinutes().toString().padStart(2, "0")} ${suffix}`,
              );

              cpu_data.push(0);
              memory_data.push(0);
            }

            for (let i = 0; i < 120; i++) {
              if (i >= timestamps.length) {
                break;
              }
              const time = parseSqlTimestamp(timestamps[i]);
              const now = new Date();
              const minutes_before = (now - time) / 1000 / 60;
              cpu_data[120 - Math.floor(minutes_before)] = cpu[i];
              memory_data[120 - Math.floor(minutes_before)] = memory[i];
            }

            const ctx_cpu = document.getElementById(
              "sdeployment-overview-cpu-chart",
            );
            const cpuChart = new Chart(
              ctx_cpu,
              JSON.parse(JSON.stringify(config)),
            );
            cpuChart.config.type = "line";
            cpuChart.data.datasets = [
              {
                label: "CPU Usage",
                data: cpu_data,
                backgroundColor: "rgb(245, 140, 140)",
                borderColor: "#000000",
                borderWidth: 1,
                borderSkipped: false,
                borderRadius: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                hitRadius: 20,
              },
            ];
            cpuChart.data.labels = labels;
            cpuChart.options.scales.x.ticks.callback = function (val, index) {
              return index % 15 == 1 ? this.getLabelForValue(val) : "";
            };
            cpuChart.update();

            const ctx_memory = document.getElementById(
              "sdeployment-overview-memory-chart",
            );
            const memoryChart = new Chart(
              ctx_memory,
              JSON.parse(JSON.stringify(config)),
            );
            memoryChart.config.type = "line";
            memoryChart.data.datasets = [
              {
                label: "Memory Usage",
                data: memory_data,
                backgroundColor: "#7fd58f",
                borderColor: "#000000",
                borderWidth: 1,
                borderSkipped: false,
                borderRadius: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                hitRadius: 20,
              },
            ];
            memoryChart.data.labels = labels;
            memoryChart.options.scales.x.ticks.callback = function (
              val,
              index,
            ) {
              return index % 15 == 1 ? this.getLabelForValue(val) : "";
            };
            memoryChart.update();
          }

          // uptime monitoring information
          const uptime_meta = meta.uptime;
          for (let i = 0; i < uptime_meta.monitors.length; i++) {
            const monitor = uptime_meta.monitors[i];
            let data = [];
            for (let i = 0; i < 24; i++) {
              // one hour intervals
              data.push([]);
            }
            for (let i = 0; i < monitor.statuses.length; i++) {
              const time = parseSqlTimestamp(monitor.timestamps[i]);
              const now = new Date();
              const hours_before = (now - time) / 1000 / 60 / 60;
              if (hours_before < 24) {
                console.log(monitor.statuses[i]);
                data[23 - Math.floor(hours_before)].push(
                  monitor.statuses[i] ? 1 : 2,
                );
              }
            }
            let str = "";
            for (let i = 0; i < data.length; i++) {
              if (data[i].length == 0) {
                str += `<div class="monitoring-sline unknown"></div>`;
              } else {
                let sum = 0;
                for (let j = 0; j < data[i].length; j++) {
                  sum += data[i][j];
                }
                const avg = sum / data[i].length;
                console.log(avg);
                if (avg < 1.35) {
                  str += `<div class="monitoring-sline up"></div>`;
                } else if (avg < 1.65) {
                  str += `<div class="monitoring-sline degraded"></div>`;
                } else {
                  str += `<div class="monitoring-sline down"></div>`;
                }
              }
            }
            console.log(monitor);
            $("#sdeployment-monitoring-list").append(`
              <div class="sdeployment-rerror-card">
                <div class="sdeployment-monitoring-label">
                  <h1>${monitor.name}</h1>
                  <p>${monitor.url}</p>
                </div>
                <div>
                  <div
                    style="
                      display: flex;
                      flex-direction: row;
                      align-items: center;
                      justify-content: flex-start;
                    "
                    id="sdeployment-monitoring-container"
                  >
                  ${str}
                  </div>
                  <div class="simple-row sdeployment-monitoring-label">
                    <p>1 day ago</p>
                    <p>Now</p>
                  </div>
                </div>
              </div>
              <hr />
              `);
          }

          // populate uptime overview statistics data
          let ouptime_sum = 0;
          let ouptime_count = 0;
          for (let i = 0; i < uptime_meta.monitors.length; i++) {
            const monitor = uptime_meta.monitors[i];
            for (let j = 0; j < monitor.statuses.length; j++) {
              if (monitor.statuses[j]) {
                ouptime_sum += 1;
              }
              ouptime_count += 1;
            }
          }
          if (ouptime_count > 0) {
            $("#sdeployment-overview-ouptime").text(
              ((ouptime_sum / ouptime_count) * 100).toFixed(2) + "%",
            );
          } else {
            $("#sdeployment-overview-ouptime").text("N/A");
          }

          let cuptime_sum = 0;
          let cuptime_count = 0;
          for (let i = 0; i < uptime_meta.monitors.length; i++) {
            const monitor = uptime_meta.monitors[i];
            for (let j = 0; j < monitor.statuses.length; j++) {
              const time = parseSqlTimestamp(monitor.timestamps[j]);
              const now = new Date();
              const hours_before = (now - time) / 1000 / 60 / 60;
              if (hours_before < 1) {
                if (monitor.statuses[j]) {
                  cuptime_sum += 1;
                }
                cuptime_count += 1;
              }
            }
          }
          if (cuptime_count > 0) {
            $("#sdeployment-overview-cstatus").text(
              ((cuptime_sum / cuptime_count) * 100).toFixed(2) + "% online",
            );
          } else {
            $("#sdeployment-overview-cstatus").text("N/A");
          }

          let artime_sum = 0;
          let artime_count = 0;
          for (let i = 0; i < uptime_meta.monitors.length; i++) {
            const monitor = uptime_meta.monitors[i];
            for (let j = 0; j < monitor.statuses.length; j++) {
              const time = parseSqlTimestamp(monitor.timestamps[j]);
              const now = new Date();
              const hours_before = (now - time) / 1000 / 60 / 60;
              if (hours_before < 1) {
                if (monitor.statuses[j]) {
                  artime_sum += monitor.response_times[j];
                }
                artime_count += 1;
              }
            }
          }

          if (artime_count > 0) {
            $("#sdeployment-overview-artime").text(
              (artime_sum / artime_count).toFixed(2) + " ms",
            );
          } else {
            $("#sdeployment-overview-artime").text("N/A");
          }

          let worst_rtime = 0;
          for (let i = 0; i < uptime_meta.monitors.length; i++) {
            const monitor = uptime_meta.monitors[i];
            for (let j = 0; j < monitor.statuses.length; j++) {
              const time = parseSqlTimestamp(monitor.timestamps[j]);
              const now = new Date();
              const hours_before = (now - time) / 1000 / 60 / 60;
              if (hours_before < 1) {
                if (monitor.response_times[j] > worst_rtime) {
                  worst_rtime = monitor.response_times[j];
                }
              }
            }
          }

          if (worst_rtime > 0) {
            $("#sdeployment-overview-wrtime").text(
              worst_rtime.toFixed(2) + " ms",
            );
          } else {
            $("#sdeployment-overview-wrtime").text("N/A");
          }

          // links to other tabs from overview
          $("#sdeployment-cerrors").click(function() {
            window.location.href="/dashboard.html?deploymentId=" + deployment.id + "&deploymentInfo&currentTab=errors";
          }) 

          $("#sdeployment-cperformance").click(function() {
            window.location.href="/dashboard.html?deploymentId=" + deployment.id + "&deploymentInfo&currentTab=performance";
          })

          $("#sdeployment-cuptime").click(function() {
            window.location.href="/dashboard.html?deploymentId=" + deployment.id + "&deploymentInfo&currentTab=uptime";
          })

          $("#sdeployment-settings-edit").click(function() {
            openModal({
              title: "Edit Deployment Details",
              fields: [
                {
                  id: "name",
                  label: "Name",
                  type: "text",
                  placeholder: "",
                  value: deployment.name,
                  validate: (value) => {
                    if (value.length < 2) {
                      return {
                        success: false,
                        message: "Deployment name must be at least 2 characters long"
                      }
                    }
                    return {
                      success: true
                    }
                    
                  }
                },
                {
                  id: "version",
                  label: "Version",
                  type: "text",
                  placeholder: "",
                  value: deployment.version,
                  validate: (value) => {
                    if (value.length < 1) {
                      return {
                        success: false,
                        message: "Version must be provided"
                      }
                    }
                    return {
                      success: true
                    }
                  }
                },
                {
                  id: "environment",
                  label: "Environment",
                  type: "select",
                  options: [
                    { label: "Production", value: "production"},
                    { label: "Staging", value: "staging"},
                    { label: "Development", value: "development"}
                  ]
                },
                {
                  id: 'status',
                  label: "Status",
                  type: 'select',
                  options: [
                    { label: "Active", value: "active"},
                    { label: "Inactive", value: 'inactive'}
                  ],
                  value: deployment.status
                },
                {
                  id: "type",
                  label: "Type",
                  type: "select",
                  options: [
                    { label: "Backend", value: "backend"},
                    { label: "Frontend", value: "frontend"}
                  ],
                  value: deployment.type
                },
                
              ]
            }).then((data) => {
              fetch("/api/deployments/" + deployment.id, {
                method: "PUT",
                headers: {
                  "Content-Type" : "application/json"
                },
                body: JSON.stringify({
                  name: data.name,
                  version: data.version,
                  environment: data.environment,
                  status: data.status,
                  type: data.type
                })
              }).then((resp) => resp.json())
                .then((json) => {
                  console.log(json);
                  if (json.success) {
                    $("#sdeployment-name").text(json.deployment.name);
                    $("#sdeployment-version").text(json.deployment.version);
                    $("#sdeployment-environment").text(json.deployment.environment.charAt(0).toUpperCase() + json.deployment.environment.slice(1));
                    $("#sdeployment-environment-div").removeClass("production staging development").addClass(json.deployment.environment);
                    $("#sdeployment-status").text(json.deployment.status.charAt(0).toUpperCase() + json.deployment.status.slice(1));
                    $("#sdeployment-status-div").removeClass("active inactive").addClass(json.deployment.status);
                    $("#sdeployment-type").text(json.deployment.type.charAt(0).toUpperCase() + json.deployment.type.slice(1));

                    deployment = json.deployment;
                    project.deployments[project.deployments.findIndex((d) => d.id === deployment.id)] = deployment;
                  }
                })
            })
          })

          // end overview tab popualtion
        } else if (currentTab === "errors") {
          // return; // for now before i make the UI
          // event statistics + timeline area
          // $("#sdeployment-totalerrors").text(deployment.error_events.length);
          // const unresolved_errors = deployment.error_events.filter(
          //   (e) => e.status !== "resolved",
          // ).length;
          // $("#sdeployment-unresolvederrors").text(unresolved_errors);

          let unresolved_timeline = [];
          let resolved_timeline = [];
          for (let i = 0; i < 18; i++) {
            unresolved_timeline.push(0);
            resolved_timeline.push(0);
          }

          let latest_time = null;
          for (let i = 0; i < deployment.error_events.length; i++) {
            const event_time = parseSqlTimestamp(
              deployment.error_events[i].timestamp,
            );
            const now = new Date();
            const time = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              24,
            );

            const hours_before = (time - event_time) / 1000 / 60 / 60;

            if (hours_before < 72) {
              if (deployment.error_events[i].status == "unresolved") {
                unresolved_timeline[17 - Math.floor(hours_before / 4)] += 1;
              } else {
                resolved_timeline[17 - Math.floor(hours_before / 4)] += 1;
              }
            }
          }

          let labels = [];
          for (let i = 17; i >= 0; i--) {
            const now = new Date();
            const time = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              24 - i * 4,
            );
            const hours = time.getHours();
            const suffix = hours >= 12 ? "pm" : "am";
            // if (hours < 4) {
            //   labels.push(((hours + 11) % 12) + 1 + " " + suffix);
            // } else {
            //   labels.push("");
            // }
            labels.push(((hours + 11) % 12) + 1 + " " + suffix);
          }

          // create timeline chart

          const dayBoundaryPlugin = {
            id: "dayBoundary",
            beforeDraw: (chart) => {
              const { ctx, chartArea, scales } = chart;
              let midnightIndices = [5, 11, 17];

              ctx.save();
              midnightIndices.forEach((idx) => {
                const x = scales.x.getPixelForValue(idx);
                ctx.strokeStyle = "rgba(0,0,0,0.2)";
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(x, chartArea.top);
                ctx.lineTo(x, chartArea.bottom);
                ctx.stroke();
              });
              ctx.restore();
            },
          };

          const ctx = document.getElementById(
            "sdeployment-errors-timeline-chart",
          );
          const timelineChart = new Chart(ctx, {
            ...JSON.parse(JSON.stringify(config)),
            plugins: [dayBoundaryPlugin],
          });
          console.log(unresolved_timeline);
          console.log(resolved_timeline);
          timelineChart.config.plugins = [dayBoundaryPlugin];
          timelineChart.data.datasets = [
            {
              label: "Unresolved Errors",
              data: unresolved_timeline,
              backgroundColor: "rgb(245, 140, 140)",
              borderColor: "#000000",
              borderWidth: 2,
              borderSkipped: false,
              borderRadius: 3,
            },
            {
              label: "Resolved Errors",
              data: resolved_timeline,
              backgroundColor: "#7fd58f",
              borderColor: "#000000",
              borderWidth: 2,
              borderSkipped: false,
              borderRadius: 3,
            },
          ];
          timelineChart.data.labels = labels;
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

            checked_errors = checked_errors.filter((id) =>
              current_filtering.includes(id),
            );
            $("#elist-delete").attr("disabled", checked_errors.length === 0);
            $("#elist-update").attr("disabled", checked_errors.length === 0);

            for (let i = 0; i < filtered_events.length; i++) {
              const event = filtered_events[i];
              const created_at = parseSqlTimestamp(event.timestamp);
              let hours = created_at.getHours() % 12;
              let minutes = created_at.getMinutes().toString().padStart(2, "0");
              let suffix = created_at.getHours() >= 12 ? "PM" : "AM";
              let last_update = null;
              const event_updates = JSON.parse(event.updates);
              if (event_updates.length > 0) {
                last_update = parseSqlTimestamp(
                  event_updates[event_updates.length - 1].timestamp,
                );
              }
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
                  <div class="sdeployment-info-item">
                    <i class="ph ph-clock"></i>
                    <p>Created on ${created_at.getMonth() + 1}/${created_at.getDate()}/${created_at.getFullYear()} at ${hours}:${minutes} ${suffix}</p>

                  </div>
                  <p class="dproject-divider">/</p>
                  <div class="sdeployment-info-item">
                    <i class="ph ph-arrow-clockwise"></i>
                    <p>${last_update ? `Last updated on ${last_update.getMonth() + 1}/${last_update.getDate()}/${last_update.getFullYear()}` : "No updates yet"}</p>
                  </div>
                </div>
              </div>
              <hr />
            `);

              $("#checkbox-" + event.id).click(function (e) {
                if (checked_errors.includes(event.id)) {
                  // remove from checked
                  checked_errors = checked_errors.filter(
                    (id) => id !== event.id,
                  );
                  $(this).removeClass("checked");
                } else {
                  checked_errors.push(event.id);
                  $(this).addClass("checked");
                }
                e.stopPropagation();

                $("#elist-delete").attr(
                  "disabled",
                  checked_errors.length === 0,
                );
                $("#elist-update").attr(
                  "disabled",
                  checked_errors.length === 0,
                );
              });

              $("#errorevent-" + event.id).click(function () {
                window.location.href =
                  "/dashboard.html?errorEventInfo&eventId=" + event.id;
              });
            }
          }

          // recent errors list
          let recent_events = deployment.error_events.sort(
            (a, b) =>
              parseSqlTimestamp(b.timestamp) - parseSqlTimestamp(a.timestamp),
          );
          recent_events = recent_events.slice(0, 5);
          for (let i = 0; i < recent_events.length; i++) {
            const event = recent_events[i];
            const created_at = parseSqlTimestamp(event.timestamp);
            const formatted_time = formatTime(event.timestamp);
            $("#serror-rcontainer").append(`
              <div class="sdeployment-rerror-card">
                <h1>${event.title}</h1>
                <h2>${formatted_time}</h2>
              </div>
              <hr/> 
              `);
          }

          // recurring errors list
          let recurring_events = deployment.error_events.sort(
            (a, b) => b.similar_count - a.similar_count,
          );
          recurring_events = recurring_events.filter(
            (e) => e.similar_count > 1,
          );
          recurring_events = recurring_events.slice(0, 5);
          for (let i = 0; i < recurring_events.length; i++) {
            const event = recurring_events[i];
            const count = event.similar_count;
            $("#serror-rccontainer").append(`
              <div class="sdeployment-rerror-card">
                <h1>${event.title}</h1>
                <h2>${count} occurrences</h2>
              </div>
              <hr/> 
              `);
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
              // console.log(current_filtering);
              // console.log(checked_errors);
              $(this).addClass("checked");
              $("#elist-delete").attr("disabled", false);
              $("#elist-update").attr("disabled", false);
            } else {
              // deselect all
              checked_errors = [];
              current_filtering.forEach((id) => {
                $("#checkbox-" + id).removeClass("checked");
              });
              $(this).removeClass("checked");
              $("#elist-delete").attr("disabled", true);
              $("#elist-update").attr("disabled", true);
            }
          });

          // handle deleting error events
          $("#elist-delete").click(function () {
            if (checked_errors.length > 0) {
              openModal({
                title: "Delete Error Events",
                fields: [
                  {
                    id: "confirm",
                    label:
                      "Confirm you want to delete this deployment (this action cannot be undone)",
                    type: "checkbox",
                  },
                ],
              }).then((data) => {
                if (data.confirm) {
                  fetch("/api/error-events/delete", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      ids: checked_errors,
                    }),
                  })
                    .then((resp) => resp.json())
                    .then((json) => {
                      if (json.success) {
                        // update deployments object and repopulate error table
                        deployment.error_events =
                          deployment.error_events.filter(
                            (e) => !checked_errors.includes(e.id),
                          );
                        populateErrorTable(
                          $("#error-search").val().toLowerCase(),
                        );
                        $("#elist-select").removeClass("checked");
                      }
                    });
                }
              });
            }
          });

          // handle updating multiple error events
          $("#elist-update").click(function () {
            openModal({
              title: "Add Error Update",
              fields: [
                {
                  id: "message",
                  label: "Update Message",
                  type: "textarea",
                  placeholder: "",
                  value: "",
                  validation: (value) => {
                    if (value.length < 5) {
                      return {
                        success: false,
                        message:
                          "Update message must be at least 5 characters long",
                      };
                    }
                  },
                },
                {
                  id: "status",
                  label: "New Status",
                  type: "select",
                  options: [
                    { label: "Unresolved", value: "unresolved" },
                    { label: "Resolved", value: "resolved" },
                  ],
                  value: event.status,
                },
              ],
            }).then((data) => {
              fetch("/api/error-events/update", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  update: {
                    message: data.message,
                    status: data.status,
                    email: user.email,
                  },
                  ids: checked_errors,
                }),
              })
                .then((resp) => resp.json())
                .then((json) => {
                  window.location.reload();
                });
            });
          });
        } else if (currentTab === "performance") {
          const meta = JSON.parse(deployment.meta);
          if (deployment.type == "backend") {
            // show backend performance monitoring data
            // console.log(deployment);
            const backend_monitoring = meta.performance.backend_monitoring;
            const cpu = backend_monitoring.cpu_usage;
            const memory = backend_monitoring.memory_usage;
            const timestamps = backend_monitoring.timestamps;
            // populate charts for cpu and memory usage -> group by minute for at max 2 hours
            let labels = [];
            let cpu_data = [];
            let memory_data = [];
            let cpu_data_sums = [];
            let memory_data_sums = [];
            for (let i = 240; i >= 0; i--) {
              const time = new Date(Date.now() - i * 60 * 1000);
              let hours = time.getHours();
              if (hours > 12) {
                hours = hours - 12;
              }
              const suffix = time.getHours() >= 12 ? "pm" : "am";
              labels.push(
                `${hours}:${time.getMinutes().toString().padStart(2, "0")} ${suffix}`,
              );

              cpu_data_sums.push(0);
              memory_data_sums.push(0);
              cpu_data.push(0);
              memory_data.push(0);
            }


            for (let i = 0; i < timestamps.length; i++) {
              const time = parseSqlTimestamp(timestamps[i]);
              const now = new Date();
              const minutes_before = (now - time) / 1000 / 60;
              if (minutes_before < 240) {
                cpu_data_sums[240 - Math.floor(minutes_before)] += cpu[i];
                memory_data_sums[240 - Math.floor(minutes_before)] += memory[i];
                cpu_data[240 - Math.floor(minutes_before)] += 1;
                memory_data[240 - Math.floor(minutes_before)] += 1;
              }
            }
            for (let i = 0; i < 240 ;i++) {
              if (cpu_data[i] === 0) {
                cpu_data[i] = null;
              } else {
                cpu_data[i] = cpu_data_sums[i] / (cpu_data[i] || 1);
              }

              if (memory_data[i] === 0) {
                memory_data[i] = null;
              } else {
                memory_data[i] = memory_data_sums[i] / (memory_data[i] || 1);
              }
              
            }

            const ctx_cpu = document.getElementById("sdeployment-cpu-chart");
            const cpuChart = new Chart(
              ctx_cpu,
              JSON.parse(JSON.stringify(config)),
            );
            cpuChart.config.type = "line";
            cpuChart.data.datasets = [
              {
                label: "CPU Usage",
                data: cpu_data,
                backgroundColor: "rgb(245, 140, 140)",
                borderColor: "#000000",
                borderWidth: 1,
                borderSkipped: false,
                borderRadius: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                hitRadius: 20,
              },
            ];
            cpuChart.data.labels = labels;
            cpuChart.options.scales.x.ticks.callback = function (val, index) {
              return index % 15 == 7 ? this.getLabelForValue(val) : "";
            };
            cpuChart.update();

            const ctx_memory = document.getElementById(
              "sdeployment-memory-chart",
            );
            const memoryChart = new Chart(
              ctx_memory,
              JSON.parse(JSON.stringify(config)),
            );
            memoryChart.config.type = "line";
            memoryChart.data.datasets = [
              {
                label: "Memory Usage",
                data: memory_data,
                backgroundColor: "#7fd58f",
                borderColor: "#000000",
                borderWidth: 1,
                borderSkipped: false,
                borderRadius: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                hitRadius: 20,
              },
            ];
            memoryChart.data.labels = labels;
            memoryChart.options.scales.x.ticks.callback = function (
              val,
              index,
            ) {
              return index % 15 == 7 ? this.getLabelForValue(val) : "";
            };

            memoryChart.update();
          } else {
            // show frontend performance monitoring data
            const frontend_monitoring = JSON.parse(deployment.meta).performance
              .frontend_monitoring;
            console.log(frontend_monitoring);
            let ttfb_sum = 0;
            for (let i = 0; i < frontend_monitoring.ttfb.length; i++) {
              ttfb_sum += frontend_monitoring.ttfb[i];
            }
            const ttfb_avg = ttfb_sum / frontend_monitoring.ttfb.length;
            $("#sdeployment-ttfb").text(Math.round(ttfb_avg) + " ms");

            let fcp_sum = 0;
            for (let i = 0; i < frontend_monitoring.fcp.length; i++) {
              fcp_sum += frontend_monitoring.fcp[i];
            }
            const fcp_avg = fcp_sum / frontend_monitoring.fcp.length;
            $("#sdeployment-fcp").text(Math.round(fcp_avg) + " ms");

            let lcp_sum = 0;
            for (let i = 0; i < frontend_monitoring.lcp.length; i++) {
              lcp_sum += frontend_monitoring.lcp[i];
            }
            const lcp_avg = lcp_sum / frontend_monitoring.lcp.length;
            $("#sdeployment-lcp").text(Math.round(lcp_avg) + " ms");

            let inp_sum = 0;
            for (let i = 0; i < frontend_monitoring.inp.length; i++) {
              inp_sum += frontend_monitoring.inp[i];
            }
            const inp_avg = inp_sum / frontend_monitoring.inp.length;
            $("#sdeployment-inp").text(Math.round(inp_avg) + " ms");

            // the various timelines -> using scatter plot
            const metrics = ["ttfb", "fcp", "lcp", "inp"];
            const thresholds = {
              // labels: good, degraded, slow, excellenet
              ttfb: {
                Excellent: 500,
                Good: 800,
                Slow: 1300,
                Degraded: 1800,
              },
              fcp: {
                Excellent: 1000,
                Good: 1900,
                Slow: 2500,
                Degraded: 3200,
              },
              lcp: {
                Excellent: 2000,
                Good: 2800,
                Slow: 3800,
                Degraded: 4800,
              },
              inp: {
                Excellent: 150,
                Good: 270,
                Slow: 450,
                Degraded: 600,
              },
            };
            for (let i = 0; i < metrics.length; i++) {
              const metric = metrics[i];
              let data = [];
              for (let j = 0; j < frontend_monitoring[metric].length; j++) {
                const time = parseSqlTimestamp(
                  frontend_monitoring.timestamps[j],
                );
                data.push({
                  x: time,
                  y: frontend_monitoring[metric][j],
                });
              }
              const ctx = document.getElementById(
                `sdeployment-${metric}-chart`,
              );
              const chart = new Chart(ctx, JSON.parse(JSON.stringify(config)));
              chart.config.type = "scatter";
              chart.data.datasets = [
                {
                  label: metric.toUpperCase(),
                  data: data,
                  backgroundColor: "rgb(147, 140, 245)",
                  borderColor: "#000000",
                  borderWidth: 1,
                  borderSkipped: false,
                  borderRadius: 3,
                },
              ];
              chart.options.scales.x = {
                type: "time",
                time: {
                  unit: "hour",
                  displayFormats: {
                    hour: "h:mm a",
                  },
                },
                min: (() => {
                  const d = new Date();
                  d.setHours(d.getHours() - 72);
                  return d;
                })(),
                max: new Date(),
              };

              chart.options.scales.x.ticks = {
                maxRotation: 0,
                minRotation: 0,
                autoSkip: false,
                callback: (value) => {
                  const date = new Date(value);
                  let label = "";
                  if (date.getHours() === 0 && date.getMinutes() === 0) {
                    return date.getMonth() + 1 + "/" + date.getDate();
                  }
                  return null;
                },
              };

              let max_value = 0;
              for (let j = 0; j < frontend_monitoring[metric].length; j++) {
                if (frontend_monitoring[metric][j] > max_value) {
                  max_value = frontend_monitoring[metric][j];
                }
              }
              let max = max_value * 1.15;
              if (max < thresholds[metric].Degraded * 1.15) {
                max = thresholds[metric].Degraded * 1.15;
              }
              chart.options.scales.y.suggestedMax = max;
              chart.options.scales.y.ticks.stepSize = Math.round(max_value / 5);
              chart.options.scales.y.ticks.display = false;

              let annotations = {};
              let colors = {
                Excellent: "#a0b8eb",
                Good: "#7fd58f",
                Slow: "#f4d03f",
                Degraded: "#f5b38c",
              };
              for (let j = 0; j < Object.keys(thresholds[metric]).length; j++) {
                const threshold = Object.keys(thresholds[metric])[j];
                annotations["line" + j] = {
                  type: "line",
                  yMin: thresholds[metric][threshold],
                  yMax: thresholds[metric][threshold],
                  borderColor: colors[threshold],
                  borderWidth: 2,
                  borderDash: [7, 4],
                  label: {
                    display: false,
                  },
                };
              }
              chart.options.plugins.annotation = {
                annotations: annotations,
              };
              chart.update();
            }
          }
          // benchmarks statistics
          const benchmarks = meta.performance.benchmarks;
          let benchmarks_container = "#sdeployment-benchmarks-1";
          if (deployment.type == "frontend") {
            benchmarks_container = "#sdeployment-benchmarks-2";
          }
          for (let i = 0; i < benchmarks.length; i++) {
            const benchmark = benchmarks[i];
            let status = "";
            if (benchmark.times.length == 0) {
              status = "Unknown";
            } else {
              let duration = benchmark.times[benchmark.times.length - 1];
              if (
                (duration - benchmark.expected_time) / benchmark.expected_time >
                0.5
              ) {
                status = "Degraded";
              } else if (
                (duration - benchmark.expected_time) / benchmark.expected_time <
                -0.5
              ) {
                status = "Excellent";
              } else if (
                (duration - benchmark.expected_time) / benchmark.expected_time >=
                0.2
              ) {
                status = "Slow";
              } else if (
                (duration - benchmark.expected_time) / benchmark.expected_time <=
                0.2
              ) {
                status = "Good";
              }
            }
 

            // calculate the various stats
            let times_sum = 0;
            let worst_time = -1;
            let best_time = 9999999;
            let recent_count = 0;

            for (let j = 0; j < benchmark.times.length; j++) {
              times_sum += benchmark.times[j];
              if (benchmark.times[j] > worst_time) {
                worst_time = benchmark.times[j];
              }
              if (benchmark.times[j] < best_time) {
                best_time = benchmark.times[j];
              }
              const time = parseSqlTimestamp(benchmark.timestamps[j]);
              const now = new Date();
              const hours_before = (now - time) / 1000 / 60 / 60;
              if (hours_before < 24) {
                recent_count += 1;
              }
            }
            let average_time = 0;
            if (benchmark.times.length > 0) {
              average_time = Math.round(times_sum / benchmark.times.length);
            } else {
              average_time = "N/A";
            }

            if (worst_time == -1) {
              worst_time = "N/A";
            }

            if (best_time == 9999999) {
              best_time = "N/A";
            }
          
            $(benchmarks_container).append(`
              <div class="benchmark-item">
                <div class="pbenchmark-item1">
                  <div class="simple-row" style="width: 100%;align-items: flex-start">
                    <div>
                      <h3
                        class="benchmark-name"
                        style="margin-bottom: 5px; font-size: 20px;"
                      >
                        ${benchmark.name}
                      </h3>
                      <div class="simple-row" style="margin-bottom: 0px; width: fit-content">
                        <p>Latest Status:</p>
                        <div class="benchmark-status ${status.toLowerCase()}">
                          <p>${status}</p>
                        </div>
                      </div>
                      <div class="simple-row" style="margin-bottom: 7px">
                        <p>ID: <span style="font-weight: 600">${benchmark.id}</span></p>
                      </div>
                    </div>
                    <div class="options-brow" style="position: relative;padding:0px;">
                      <button class="options-button" id="benchmark-edit-${benchmark.id}" style="margin-top:0px;">
                        <i class="ph ph-pencil-simple"></i>
                      </button>
                      <button class="options-button" id="benchmark-delete-${benchmark.id}" style="margin-top:0px;">
                        <i class="ph ph-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div
                    class="pbenchmark-item2-subitem"
                    style="margin-left: 0px"
                  >
                    <div class="statistic-row">
                      <div class="statistic">
                        <h3>Average Time</h3>
                        <p>${average_time} ms</p>
                      </div>
                      <div class="statistic">
                        <h3>Worst Time</h3>
                        <p>${worst_time} ms</p>
                      </div>
                      <div class="statistic">
                        <h3>Best Time</h3>
                        <p>${best_time} ms</p>
                      </div>
                    </div>
                    <div class="statistic-row">
                      <div class="statistic">
                        <h3>Last Measurement</h3>
                        <p>${formatTime(benchmark.timestamps[benchmark.timestamps.length - 1])}</p>
                      </div>
                      <div class="statistic">
                        <h3>Measurements (last 24 hours)</h3>
                        <p>${recent_count}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="pbenchmark-item1" style="border: solid 1px black; width: 50%;padding-top: 4px;padding-bottom: 4px;">
                  <div
                    class="pbenchmark-ccontainer"
                    style="height: 20vh; width: 100%;"
                  >
                    <canvas id="pbenchmark-chart-${i}"></canvas>
                  </div>
                </div>
              </div>
              <hr />
              `);
            // plot benchmark graph of measurements using a scatter plot -> last 3 days only
            let data = [];
            for (let i = 0; i < benchmark.times.length; i++) {
              const time = parseSqlTimestamp(benchmark.timestamps[i]);
              const now = new Date();
              const hours_before = (now - time) / 1000 / 60 / 60;
              if (hours_before < 72) {
                data.push({
                  x: parseSqlTimestamp(benchmark.timestamps[i]),
                  y: benchmark.times[i],
                });
              }
            }
            const ctx_benchmark = document.getElementById(
              "pbenchmark-chart-" + i,
            );
            const benchmarkChart = new Chart(
              ctx_benchmark,
              JSON.parse(JSON.stringify(config)),
            );
            benchmarkChart.config.type = "scatter";
            benchmarkChart.data.datasets = [
              {
                label: "Measurement Time",
                data: data,
                backgroundColor: "rgb(147, 140, 245)",
                borderColor: "#000000",
                borderWidth: 1,
                borderSkipped: false,
                borderRadius: 3,
              },
            ];

            benchmarkChart.options.scales.x = {
              type: "time",
              time: {
                unit: "hour",
                displayFormats: {
                  hour: "h:mm a",
                },
              },
              min: (() => {
                const d = new Date();
                d.setHours(d.getHours() - 72);
                return d;
              })(),
              max: new Date(),
            };

            benchmarkChart.options.scales.x.ticks = {
              maxRotation: 0,
              minRotation: 0,
              autoSkip: false,
              callback: (value) => {
                const date = new Date(value);
                let label = "";
                if (date.getHours() === 0 && date.getMinutes() === 0) {
                  return date.getMonth() + 1 + "/" + date.getDate();
                }
                return null;
              },
            };
            let annotations = {};
            const statuses = ["Excellent", "Good", "Slow", "Degraded"];
            const multipliers = [0.5, 0.2, -0.2, -0.5];
            const colors = ["#a0b8eb", "#7fd58f", "#f4d03f", "#f5b38c"];
            for (let j = 0; j < statuses.length; j++) {
              const threshold = benchmark.expected_time * (1 + multipliers[j]);
              annotations["line" + j] = {
                type: "line",
                yMin: threshold,
                yMax: threshold,
                borderColor: colors[j],
                borderWidth: 2,
                borderDash: [7, 4],
                label: {
                  display: false,
                },
              };
            }
            annotations["expected"] = {
              type: "line",
              yMin: benchmark.expected_time,
              yMax:benchmark.expected_time,
              borderColor: "#aaaaaa",
              borderWidth:2,
              borderDash: [7, 4],
              label: {
                display: true,
                content: "Expected Time",
                position: "start",
                backgroundColor: "rgba(70, 70, 70, 0.63)",
                color: "white"
              }
            }
            benchmarkChart.options.plugins.annotation = {
              annotations: annotations,
            };
            benchmarkChart.options.y = {
              suggestedMax: worst_time * 1.15,
            };
            benchmarkChart.update();

            // handle benchmark editing and deleting
            $("#benchmark-edit-" + benchmark.id).click(function() {
              openModal({
                title: "Edit Benchmark",
                fields: [
                  {
                    id: "name",
                    label: "Benchmark Name",
                    type: "text",
                    value: benchmark.name,
                    placeholder: "",
                    validation: (value) => {
                      if (value.length < 2) {
                        return {
                          success: false,
                          message: "Benchmark name must be at least 2 characters long"
                        }
                      }
                      return {
                        success: true,
                      }
                    }
                  },
                  {
                    id: "expected_time",
                    label: "Expected Time (ms)",
                    type: "text",
                    value: benchmark.expected_time,
                    placeholder: "",
                    validation: (value) => {
                      if (isNaN(Number(str.trim()))) {
                        return {
                          success: false,
                          message: "Expected time must be a real number"
                        }
                      }
                      return {
                        success: true
                      }
                    }
                  }
                ]
              }).then((data) => {
                console.log(data);
                fetch("/api/deployments/" + deployment.id + "/benchmarks/" + benchmark.id, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    name: data.name,
                    expected_time: data.expected_time
                  })
                }).then((resp) => resp.json())
                  .then((json) => {
                    if (json.success) {
                      window.location.reload();
                    }
                  })
              })
            })

            $("#benchmark-delete-" + benchmark.id).click(function() {
              openModal({
                title: "Delete Benchmark",
                fields: [
                  {
                    id: "confirm",
                    label: "Confirm you want to delete this benchmark (this action is irreversible)",
                    type: "checkbox",
                    value: false,
                  }
                ]
              }).then((data) => {
                if (data.confirm) {
                  fetch("/api/deployments/" + deployment.id + "/benchmarks/" + benchmark.id, {
                    method: "DELETE",
                    headers: {
                      "Content-Type": "application/json"
                    }
                  }).then((resp) => resp.json())
                    .then((json) => {
                      window.location.reload();
                    })

                }
              })
            })
          }

          // new benchmark card
          $(benchmarks_container).append(`
            <div class="benchmark-item" id="new-benchmark"style="justify-content: center; align-items: center; padding: 20px;">
              <div style="display:flex;flex-direction:row; align-items: center; justify-content: center;gap: 10px;">
                <i class="ph ph-plus" style="font-size: 20px;"></i>
              <p style="margin-top:5px;margin-bottom:5px;" >New Benchmark</p>
              </div>
            </div>
            <hr/>
            `)

          $("#new-benchmark").click(function() {
            openModal({
              title: "Create New Benchmark",
              fields: [
                {
                  id: "name",
                  label: "Benchmark Name",
                  type: "text",
                  value: "",
                  placeholder: "",
                  validation: (value) => {
                    if (value.length < 2) {
                      return {
                        success: false,
                        message: "Benchmark name must be at least 2 characters long"
                      }
                    }
                    return {
                      success: true
                    }
                  }
                },
                {
                  id: "expected_time",
                  label: "Expected Time (ms)",
                  type: "text",
                  value: "",
                  placeholder: "",
                  validation: (value) => {
                    if (isNaN(Number(str.trim()))) {
                      return {
                        success: false,
                        message: "Expected time must be a real number"
                      }
                    }
                    return {
                      success: true,
                    }
                  }
                }
              ]
            }).then((data) => {
              fetch("/api/deployments/" + deployment.id + "/benchmarks", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: data.name,
                  expected_time: data.expected_time  
                })
              }).then((resp) => resp.json())
                .then((json) => {
                  if (json.success) {
                    window.location.reload();
                  }
                })
                
            })

          })

        } else if (currentTab === "uptime") {
          // handle uptime monitoring stats
          const meta = JSON.parse(deployment.meta);
          const uptime_monitoring = meta.uptime;
          let total_monitors = 0;
          let down_monitors = 0;
          let uptime_sum = 0;
          let uptime_count = 0;

          for (let i = 0; i < uptime_monitoring.monitors.length; i++) {
            const monitor = uptime_monitoring.monitors[i];
            if (monitor.active) {
              total_monitors += 1;
            } else {
              break;
            }

            for (let j = 0; j < monitor.statuses.length; j++) {
              const time = parseSqlTimestamp(monitor.timestamps[j]);
              const now = new Date();
              const hours_before = (now - time) / 1000 / 60 / 60;
              if (hours_before < 24) {
                if (monitor.statuses[j]) {
                  uptime_sum += 1;
                }
                uptime_count += 1;
              }
            }
            if (monitor.status === "down") {
              down_monitors += 1;
            }
          }
          let uptime_percentage = "N/A";
          if (uptime_count > 0) {
            uptime_percentage =
              Math.round((uptime_sum / uptime_count) * 100) + "%";
          }
          $("#sdeployment-uptime-amonitors").text(total_monitors);
          $("#sdeployment-uptime-ouptime").text(uptime_percentage);
          $("#sdeployment-uptime-dmonitors").text(down_monitors);

          // uptime timeline and response time scatter chart
          let overall_sums = [];
          let overall_counts = [];
          let overall_percentages = [];
          let labels = [];
          for (let i = 0; i < 72; i++) {
            const time = new Date(Date.now() - (72 - i) * 60 * 60 * 1000);
            let hours = time.getHours();
            if (hours > 12) {
              hours = hours - 12;
            }
            if (hours === 0) {
              hours = 12;
            }

            let suffix = time.getHours() >= 12 ? "PM" : "AM";
            labels.push(
              `${time.getMonth() + 1}/${time.getDate()} ${hours} ${suffix}`,
            );
            overall_sums.push(0);
            overall_counts.push(0);
          }

          for (let i = 0; i < uptime_monitoring.monitors.length; i++) {
            for (
              let j = 0;
              j < uptime_monitoring.monitors[i].statuses.length;
              j++
            ) {
              const time = parseSqlTimestamp(
                uptime_monitoring.monitors[i].timestamps[j],
              );
              const now = new Date();
              const hours_before = (now - time) / 1000 / 60 / 60;
              if (hours_before < 72) {
                const index = 72 - Math.floor(hours_before);
                if (uptime_monitoring.monitors[i].statuses[j]) {
                  overall_sums[index] += 1;
                }
                overall_counts[index] += 1;
              }
            }
          }
          for (let i = 0; i < overall_sums.length; i++) {
            if (overall_counts[i] > 0) {
              overall_percentages.push(
                (overall_sums[i] / overall_counts[i]) * 100,
              );
            } else {
              overall_percentages.push(0);
            }
          }

          const ctx = document.getElementById("sdeployment-ouptime-chart");
          const uptimeChart = new Chart(
            ctx,
            JSON.parse(JSON.stringify(config)),
          );
          uptimeChart.config.type = "line";
          uptimeChart.data.datasets = [
            {
              label: "Uptime Percentage",
              data: overall_percentages,
              backgroundColor: "#7fd58f",
              borderColor: "#000000",
              borderWidth: 1,
              borderSkipped: false,
              borderRadius: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              hitRadius: 20,
            },
          ];
          uptimeChart.data.labels = labels;
          uptimeChart.options.scales.x.ticks.callback = function (val, index) {
            const now = new Date();
            const date = new Date(
              now.getTime() - (72 - index) * 60 * 60 * 1000,
            );
            if (date.getHours() === 0) {
              return date.getMonth() + 1 + "/" + date.getDate();
            }
            return null;
          };
          let annotations = {};
          for (let i = 0; i < 72; i++) {
            const now = new Date();
            const date = new Date(now.getTime() - (72 - i) * 60 * 60 * 1000);
            if (date.getHours() === 0) {
              annotations["line" + i] = {
                type: "line",
                scaleID: "x",
                value: i,
                borderColor: "rgba(0,0,0,0.5)",
                borderWidth: 1,
                borderDash: [5, 5],
                label: {
                  display: false,
                },
              };
            }
          }
          uptimeChart.options.plugins.annotation = {
            annotations: annotations,
          };
          uptimeChart.update();

          let response_time_datasets = []; // scatter plot
          let annotations2 = {};
          let data = [];

          for (let i = 0; i < uptime_monitoring.monitors.length; i++) {
            const monitor = uptime_monitoring.monitors[i];
            if (!monitor.active) {
              continue;
            }
            for (let j = 0; j < monitor.response_times.length; j++) {
              const time = parseSqlTimestamp(monitor.timestamps[j]);

              data.push({
                x: time,
                y: parseInt(monitor.response_times[j]),
              });
            }
          }
          response_time_datasets.push(data);

          // console.log(response_time_datasets);

          const ctx_response = document.getElementById(
            "sdeployment-responsetime-chart",
          );
          const responseChart = new Chart(
            ctx_response,
            JSON.parse(JSON.stringify(config)),
          );
          let datasets = [];
          let colors = [
            "rgb(147, 140, 245)",
            "rgb(140, 201, 245)",
            "rgb(140, 245, 187)",
            "rgb(192, 245, 140)",
            "rgb(245, 243, 140)",
            "rgb(245, 214, 140)",
            "rgb(245, 185, 140)",
            "rgb(245, 140, 140)",
            "rgb(245, 140, 207)",
            "rgb(203, 140, 245)",
          ]; // max 10 monitors
          for (let i = 0; i < 1; i++) {
            // calc average value and plot as annotation
            let total_response_time = 0;
            for (let j = 0; j < response_time_datasets[i].length; j++) {
              total_response_time += response_time_datasets[i][j].y;
            }
            const avg = Math.round(
              total_response_time / response_time_datasets[i].length,
            );
            if (total_response_time > 0) {
              $("#sdeployment-responsetime-avg").text(avg + " ms");
            } else {
              $("#sdeployment-responsetime-avg").text("N/A");
            }
            annotations2["line" + i] = {
              type: "line",
              scaleID: "y",
              value: avg,
              borderColor: colors[i % colors.length],
              borderWidth: 2,
              borderDash: [7, 4],
              label: {
                display: false,
              },
            };
            datasets.push({
              label: "Response Time",
              data: response_time_datasets[i],
              backgroundColor: colors[i % colors.length],
              borderColor: "#000000",
              borderWidth: 1,
              borderSkipped: false,
              borderRadius: 3,
            });
          }

          responseChart.config.type = "scatter";
          responseChart.data.datasets = datasets;
          responseChart.options.scales.x = {
            type: "time",
            time: {
              unit: "hour",
              displayFormats: {
                hour: "h:mm a",
              },
            },
            min: (() => {
              const d = new Date();
              d.setHours(d.getHours() - 72);
              return d;
            })(),
            max: new Date(),
          };

          responseChart.options.scales.x.ticks = {
            maxRotation: 0,
            minRotation: 0,
            autoSkip: false,
            callback: (value) => {
              const date = new Date(value);
              let label = "";
              if (date.getHours() === 0 && date.getMinutes() === 0) {
                return date.getMonth() + 1 + "/" + date.getDate();
              }
              return null;
            },
          };

          responseChart.options.plugins.annotation = {
            annotations: annotations2,
          };
          responseChart.options.scales.y.min = undefined;
          responseChart.options.scales.y.max = undefined;

          // for debugging
          // responseChart.options.scales.x.min = '2026-05-25T09:45:00.000Z';
          // responseChart.options.scales.x.max = '2026-05-25T13:15:00.000Z';

          responseChart.update();
          let current_filtering = [];
          let checked_monitors = [];

          // Functionality for monitoring list table
          function populateMonitoringTable(filter) {
            const container = $("#sdeployment-mlist");
            container.empty();
            let monitors = meta.uptime.monitors;
            if (filter.includes("status:active")) {
              console.log("active monitors");
              console.log(monitors);
              monitors = monitors.filter((m) => m.active);
              console.log(monitors);
              filter = filter.replace("status:active", "");
            }

            if (filter.includes("status:inactive")) {
              monitors = monitors.filter((m) => !m.active);
              filter = filter.replace("status:inactive", "");
            }

            monitors = monitors.filter((m) =>
              m.name.toLowerCase().includes(filter.toLowerCase()),
            );

            current_filtering = monitors.map((m) => m.id);
            checked_monitors = checked_monitors.filter((id) =>
              current_filtering.includes(id),
            );

            $("#mlist-delete").attr("disabled", checked_monitors.length === 0);
            for (let i = 0; i < monitors.length; i++) {
              const monitor = monitors[i];
              let indicator = "unknown";
              if (monitor.active) {
                if (monitor.status === "up") {
                  indicator = "up";
                } else {
                  indicator = "down";
                }
              }

              let uptime_chart = "";
              let data_sums = []; // shows two days
              let data_counts = [];
              for (let j = 0; j < 48; j++) {
                data_sums.push(0);
                data_counts.push(0);
              }

              for (let j = 0; j < monitor.statuses.length; j++) {
                const time = parseSqlTimestamp(monitor.timestamps[j]);
                const now = new Date();
                const hours_before = (now - time) / 1000 / 60 / 60;
                if (hours_before < 48) {
                  const index = 48 - Math.floor(hours_before);
                  if (monitor.statuses[j]) {
                    data_sums[index] += 1;
                  }
                  data_counts[index] += 1;
                }
              }
              for (let j = 0; j < 48; j++) {
                let status = "up";
                if (data_counts[j] > 0) {
                  const avg = Math.round(data_sums[j] / data_counts[j]);
                  if (avg > 0.7) {
                    status = "up";
                  } else if (avg > 0.3) {
                    status = "degraded";
                  } else {
                    status = "down";
                  }
                } else {
                  status = "unknown";
                }
                uptime_chart += `<div class="monitoring-sline ${status}"></div>`;
              }

              $("#sdeployment-mlist").append(`
                <div class="sdeployment-monitor" id="monitor-${monitor.id}">
                  <div class="monitor-row">
                    <div style="margin-left: 6px;margin-right:0px;" class="checkbox ${checked_monitors.includes(monitor.id) ? "checked" : ""}" id="mcheckbox-${monitor.id}">
                      <i class="ph ph-check"></i>
                    </div>
                    <div class="monitor-indicator ${indicator}"></div>
                    <h3>${monitor.name}</h3>
                    <div class="monitor-status ${monitor.active ? "active" : "inactive"}">
                      <p class="monitor-status-text">${monitor.active ? "Active" : "Inactive"}</p>
                    </div>
                  </div>
                  <div class="monitor-row" style="gap: 0px">
                    <div>
                      <div class="simple-row">
                        ${uptime_chart}
                      </div>
                      <div class="simple-row sdeployment-monitoring-label">
                        <p>1 day ago</p>
                        <p>Now</p>
                      </div>
                    </div>
                  </div>
                </div>
                <hr />
              `);

              $("#mcheckbox-" + monitor.id).click(function () {
                if (checked_monitors.includes(monitor.id)) {
                  checked_monitors = checked_monitors.filter(
                    (id) => id !== monitor.id,
                  );
                  $(this).removeClass("checked");
                } else {
                  checked_monitors.push(event.id);
                  $(this).addClass("checked");
                }
                e.stopPropagation();

                $("#mlist-delete").attr(
                  "disabled",
                  checked_monitors.length === 0,
                );
              });


              // onclick -> open page with monitor details - TODO
              $("#monitor-" + monitor.id).click(function () {
                window.location.href =
                  "./dashboard.html?projectId=" +
                  project.id +
                  "&deploymentId=" +
                  deployment.id +
                  "&monitorId=" +
                  monitor.id +
                  "&monitorInfo";
              });
              // populate response time chart -> scatter chart -> scrap chart bcs it dosen't fit
              // let response_data = [];
              // for (let j =0; j < monitor.response_times.length; j++) {
              //   const time = parseSqlTimestamp(monitor.timestamps[j]);
              //   response_data.push({
              //     x: time,
              //     y: parseInt(monitor.response_times[j])
              //   })
              // }

              // console.log(response_data);
              // const ctx_response = document.getElementById(`monitor-response-chart-${monitor.id}`);
              // const responseChart = new Chart(ctx_response, JSON.parse(JSON.stringify(config)));
              // responseChart.config.type = "scatter";
              // responseChart.data.datasets = [
              //   {
              //     label: "Response Time",
              //     data: response_data,
              //     backgroundColor: "rgb(147, 140, 245)",
              //     borderColor: "#000000",
              //     borderWidth: 1,
              //     borderSkipped: false,
              //     borderRadius: 3,
              //   }
              // ];

              // responseChart.options.scales.x = {
              //   type: "time",
              //   time: {
              //     unit: "hour",
              //     displayFormats: {
              //       hour: "h:mm a"
              //     }
              //   },
              //   min: (() => {
              //     const d = new Date();
              //     d.setHours(d.getHours() - 24);
              //     return d;
              //   })(),
              //   max: new Date(),
              // };

              // responseChart.options.scales.x.ticks = {
              //   maxRotation: 0,
              //   minRotation: 0,
              //   autoSkip: false,
              //   callback: (value) => {
              //     const date = new Date(value);
              //     let label = "";
              //     if (date.getHours() === 0 && date.getMinutes() === 0) {
              //       return date.getMonth() + 1 + "/" + date.getDate();
              //     }
              //     return null;
              //   }
              // }

              // responseChart.options.scales.y.ticks.display = false;
              // responseChart.update();
            }
            // new monitor button or something
            $("#sdeployment-mlist").append(`
              <div class="sdeployment-monitor dproject-card" id="monitor-new" style="justify-content: center;padding:20px;">
                <div class="dproject-info">
                  <i class="ph ph-plus" style="font-size: 20px;"></i>
                  <p style="margin-top:5px;margin-bottom:5px;">New Monitor</p>
                </div>
              </div>  
              <hr/>
            `)
            $("#monitor-new").click(function() {
              openModal({
                title: "Create New Monitor",
                fields: [
                  {
                    id: "name",
                    label: "Monitor Name",
                    type: "text",
                    placeholder: "",
                    validate: (value) => {
                      if (value.length < 2) {
                        return {
                          success: false,
                          message: "Monitor name must be at least 2 characters long"
                        }
                      }
                      return {
                        success: true
                      }
                    },
                    value: "",
                  },
                  {
                    id: "url",
                    label: "Monitor URL",
                    type: "text",
                    placeholder: "",
                    validate: (value) => {
                      try {
                        new URL(value);
                        return {
                          success: true
                        }
                      } catch (e) {
                        return {
                          success: false,
                          message: "Please enter a valid URL"
                        }
                      }
                    },
                    value: "",
                  },
                  {
                    id: "interval",
                    label: "Monitoring Interval",
                    type: "select",
                    options: [
                      { label: "15 minute", value: 15}
                    ],
                    value: 15
                  },
                  {
                    id: "active",
                    label: "Monitor Status",
                    type: "select",
                    options: [
                      { label: "Active", value: true},
                      { label: "Inactive", value: false},
                    ],
                    value: true
                  }
                ]
              }).then((data) => {

                fetch("/api/deployments/" + deployment.id + "/monitors", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    name: data.name,
                    url: data.url,
                    active: data.active == "true",
                  })
                }).then((resp) => resp.json())
                  .then((json) => {
                    if (json.success) {
                      const updated_deployment = json.deployment;
                      const updated_meta = JSON.parse(updated_deployment.meta);
                      const monitor_id = json.monitor_id;
                      const monitor = updated_meta.uptime.monitors.find((m) => m.id === monitor_id);
                      window.location.href = "./dashboard.html?projectId=" + project.id + "&deploymentId=" + updated_deployment.id + "&monitorId=" + monitor.id + "&monitorInfo";
                    }
                  })

              })
            })
          }


          populateMonitoringTable($("#mlist-search").val().toLowerCase());
          $("#mlist-search").on("input", function () {
            populateMonitoringTable($("#mlist-search").val().toLowerCase());
          });

          $("#mlist-select").click(function () {
            if (checked_monitors.length < current_filtering.length) {
              checked_monitors = [...current_filtering];
              current_filtering.forEach((id) => {
                $("#mcheckbox-" + id).addClass("checked");
              });
              $(this).addClass("checked");
              $("#mlist-delete").attr("disabled", false);
            } else {
              checked_monitors = [];
              current_filtering.forEach((id) => {
                $("#mcheckbox-" + id).removeClass("checked");
              });
              $(this).removeClass("checked");
              $("#mlist-delete").attr("disabled", true);
            }
          });

          // TODO: handle deleting monitors
          $("#mlist-delete").click(function () {});
        } else if (currentTab === "settings") {
          // handle editing deployment details
          console.log(deployment);
          $("#sdeployment-settings-dname").text(deployment.name);
          $("#sdeployment-settings-dstatus").text(deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1));
          $("#sdeployment-settings-denv").text(deployment.environment.charAt(0).toUpperCase() + deployment.environment.slice(1));
          $("#sdeployment-settings-dversion").text(deployment.version);
          $("#sdeployment-settings-dapi-key").text(deployment.api_key);
          
          $(".apikey-container2").click(function () {
            $(this).toggleClass("show");
          });
          $("#sdeployment-settings-dtype").text(deployment.type.charAt(0).toUpperCase() + deployment.type.slice(1));

          //TODO -> update deplyoment edit modal
          $("#sdeployment-settings-dedit").click(function () {
            // editing deployment details
            openModal({
              title: "Edit Deployment Details",
              fields: [
                {
                  id: "name",
                  label: "Name",
                  type: "text",
                  placeholder: "",
                  value: deployment.name,
                  validate: (value) =>
                    value.length > 1
                      ? { success: true }
                      : {
                          success: false,
                          message:
                            "Deployment name must be at least 2 characters long",
                        },
                },
                {
                  id: "version",
                  label: "Version",
                  type: "text",
                  placeholder: "",
                  value: deployment.version,
                  validate: (value) =>
                    value.length > 1
                      ? { success: true }
                      : {
                          success: false,
                          message:
                            "Deployment version must be at least 2 characters long",
                        },
                },
                {
                  id: "environment",
                  label: "Environment",
                  type: "select",
                  options: [
                    { label: "Production", value: "production" },
                    { label: "Staging", value: "staging" },
                    { label: "Development", value: "development" },
                  ],
                  value: deployment.environment,
                },
                {
                  id: "status",
                  label: "Status",
                  type: "select",
                  options: [
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                  ],
                  value: deployment.status
                },
                {
                  id: "type",
                  label: "Type",
                  type: "select",
                  options: [
                    { label: "Frontend", value: "frontend"},
                    { label: "Backend", value: "backend"}
                  ],
                  value: deployment.type
                  
                }
              ],
            }).then((data) => {
              console.log(data);
              fetch("/api/deployments/" + deployment.id, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: data.name,
                  version: data.version,
                  environment: data.environment,
                  status: data.status,
                  type: data.type

                }),
              })
                .then((resp) => resp.json())
                .then((json) => {
                  if (json.success) {
                    const new_deployment = json.deployment;
                    $("#sdeployment-settings-dname").text(new_deployment.name);
                    $("#sdeployment-settings-dstatus").text(new_deployment.status.charAt(0).toUpperCase() + new_deployment.status.slice(1));
                    $("#sdeployment-settings-denv").text(new_deployment.environment.charAt(0).toUpperCase() + new_deployment.environment.slice(1));
                    $("#sdeployment-settings-dversion").text(new_deployment.version);
                    $("#sdeployment-settings-dtype").text(new_deployment.type.charAt(0).toUpperCase() + new_deployment.type.slice(1));
                    $("#sdeployment-settings-dapi-key").text(new_deployment.api_key);
                    $(".apikey-container2").removeClass("show");

                  }

                });
            });

          });

          // handle deleting deployment
          $("#sdeployment-settings-ddelete").click(function () {
            openModal({
              title: "Delete Deployment",
              fields: [
                {
                  id: "confirm",
                  label:
                    "Confirm you want to delete this deployment (this action cannot be undone)",
                  type: "checkbox",
                },
              ],
            }).then((data) => {
              if (data.confirm) {
                fetch("/api/deployments/" + deployment.id, {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                  },
                })
                  .then((resp) => resp.json())
                  .then((json) => {
                    // console.log(json);
                    window.location.href =
                      "/dashboard.html?projectId=" +
                      project.id +
                      "&projectInfo";
                  });
              }
            });
          });

          // TODO: handle reseting API key
          $("#sdeployment-settings-dreset").click(function() {
            openModal({
              title: "Reset API key",
              fields: [
                {
                  id: "confirm",
                  label: "Confirm you want to reset the API key (this is irreversible)",
                  type: "checkbox"
                }
              ]
            }).then((data) => {
              if (data.confirm) {
                fetch("/api/deployments/" + deployment.id + "/reset_api_key", {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json"
                  }
                }).then((resp) => resp.json())
                  .then((json) => {
                    console.log(json);
                    if (json.success) {
                      $("#sdeployment-settings-dapi-key").text(json.api_key);
                      $(".apikey-container2").removeClass("show");
                    }
                  })
              }
            })
          })
        }

        // end deployment info population portion of code
      } else {
        // redirect bcs not a valid deployment
        window.location.href = "/dashboard.html";
      }
    } else if (params.has("errorEventInfo")) {
      // individual error event info page
      $("#dashboard-content").hide();
      $("#project-content").hide();
      $("#sproject-content").hide();
      $("#settings-content").hide();
      $("#sdeployment-overview-content").hide();
      $("#sdeployment-errors-content").hide();
      $("#sdeployment-performance-content-1").hide();
      $("#sdeployment-performance-content-2").hide();
      $("#sdeployment-uptime-content").hide();
      $("#sdeployment-settings-content").hide();
      $("#serror-overview-content").show();
      $("#smonitor-content").hide();

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
        const project = projects.find((p) =>
          p.deployments.find((d) => d.id == deployment.id),
        );
        $("#sbp-" + project.id).addClass("active");
        $("#sbp-" + project.id + "-" + deployment.id).addClass("active");

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
        let hours = created_at.getHours() % 12;
        if (hours === 0) {
          hours = 12;
        }
        let minutes = created_at.getMinutes().toString().padStart(2, "0");
        let suffix = created_at.getHours() >= 12 ? "PM" : "AM";
        $("#serror-createdon").text(
          created_at.getMonth() +
            1 +
            "/" +
            created_at.getDate() +
            "/" +
            created_at.getFullYear() +
            " at " +
            hours +
            ":" +
            minutes +
            " " +
            suffix,
        );
        $("#serror-stacktrace").text(String(event.stack_trace).trim());
        $("#serror-similarevents").text(event.similar_count + " events");

        let meta = JSON.parse(event.meta);

        // populate error updates
        $("#error-update-content").html("");
        const updates = JSON.parse(event.updates);
        // console.log(updates);

        for (let i = updates.length - 1; i >= 0; i--) {
          const update = updates[i];
          const update_time = parseSqlTimestamp(update.timestamp);
          $("#error-update-content").append(`
            <div class="error-update">
              <div class="error-update-row">
                <p class="error-update-name">${update.email}</p>
                <p class="error-update-date">${update_time.getMonth() + 1}/${update_time.getDate()}/${update_time.getFullYear()} ${update_time.getHours()}:${update_time.getMinutes().toString().padStart(2, "0")}</p>
              </div>
              <p class="error-update-message">
                ${update.message}
              </p>
              <div class="error-update-row" style="margin-top: 8px;margin-bottom:0px;">
                <p class="error-update-change">Status updated to</p>
                <div class="dproject-status ${update.status}" style="margin-left:10px">
                  <p>${update.status.charAt(0).toUpperCase() + update.status.slice(1)}</p>
                </div>
              </div>
            </div>
            `);
        }
        $("#error-update-content").append(`
          <div class="error-update" id="error-update-add">
            <i class="ph ph-plus" style="font-size: 20px;margin-right:10px;"></i>
            <p>New Update</p>
          </div>
          `);

        // populate breadcrumbs list
        const breadcrumbs = meta.breadcrumbs || [];
        for (let i = 0; i < breadcrumbs.length; i++) {
          const breadcrumb = breadcrumbs[i];
          $("#breadcrumbs-list").append(`
            <div class="breadcrumb-item">
              <p class="breadcrumbs-timestamp">2/5/2026 5:25 PM</p>
              <div class="breadcrumb-tag source">
                <p>${breadcrumb.source.charAt(0).toUpperCase() + breadcrumb.source.slice(1)}</p>
              </div>
              <div class="breadcrumb-tag ${breadcrumb.type}">
                <p>${breadcrumb.type.charAt(0).toUpperCase() + breadcrumb.type.slice(1)}</p>
              </div>
              <p class="breadcrumb-message">${breadcrumb.message}</p>
            </div>
            <hr />
          `);
        }
        // populate performance metrics data
        const performance = meta.performance || {};
        if (performance.cpu != {}) {
          const ctx = document.getElementById("cpu-chart");
          const cpuChart = new Chart(ctx, JSON.parse(JSON.stringify(config)));
          cpuChart.data.datasets = [
            {
              label: "CPU Usage (%)",
              data: performance.cpu,
              backgroundColor: "#8c98ff",
            },
          ];
          // console.log(performance);
          cpuChart.data.labels = performance.timestamps.map((t) => {
            const date = parseSqlTimestamp(t);
            let hours = date.getHours() % 12;
            if (hours === 0) {
              hours = 12;
            }
            let minutes = date.getMinutes().toString().padStart(2, "0");
            let suffix = date.getHours() >= 12 ? "PM" : "AM";
            return `${hours}:${minutes} ${suffix}`;
          });
          cpuChart.options.scales.x.ticks.callback = function (val, index) {
            return index % 4 == 1 ? this.getLabelForValue(val) : "";
          };
          cpuChart.options.scales.y = {
            min: 0,
            max: 100,
            grid: {
              display: true,
            },
            ticks: {
              stepSize: 25,
              display: false,
            },
            border: {
              display: false,
            },
            stacked: true,
            display: true,
          };
          cpuChart.options.scales.x.grid.display = false;
          cpuChart.update();
        }

        if (performance.memory != {}) {
          const ctx = document.getElementById("memory-chart");
          const memoryChart = new Chart(
            ctx,
            JSON.parse(JSON.stringify(config)),
          );
          memoryChart.data.datasets = [
            {
              label: "Memory Usage (%)",
              data: performance.memory,
              backgroundColor: "#4cd453",
            },
          ];
          memoryChart.data.labels = performance.timestamps.map((t) => {
            const date = parseSqlTimestamp(t);
            let hours = date.getHours() % 12;
            if (hours === 0) {
              hours = 12;
            }
            let minutes = date.getMinutes().toString().padStart(2, "0");
            let suffix = date.getHours() >= 12 ? "PM" : "AM";
            return `${hours}:${minutes} ${suffix}`;
          });
          memoryChart.options.scales.x.ticks.callback = function (val, index) {
            return index % 4 == 1 ? this.getLabelForValue(val) : "";
          };
          memoryChart.options.scales.y = {
            min: 0,
            max: 100,
            grid: {
              display: true,
            },
            ticks: {
              stepSize: 25,
              display: false,
            },
            border: {
              display: false,
            },
            stacked: true,
            display: true,
          };
          memoryChart.options.scales.x.grid.display = false;
          memoryChart.update();
        }

        // populate benchmarks
        const benchmarks = meta.performance.benchmarks || [];
        for (let i = 0; i < Object.keys(benchmarks).length; i++) {
          const key = Object.keys(benchmarks)[i];
          const value = benchmarks[key];
          let status = "Excellent";
          if (
            (value.duration - value.expected_duration) /
              value.expected_duration >
            0.5
          ) {
            // 50% slower than expected
            status = "Degraded";
          } else if (
            (value.duration - value.expected_duration) /
              value.expected_duration <
            -0.5
          ) {
            // 50% faster than expected
            status = "Excellent";
          } else if (
            (value.duration - value.expected_duration) /
              value.expected_duration >=
            0.2
          ) {
            // slower than expected
            status = "Slow";
          } else if (
            (value.duration - value.expected_duration) /
              value.expected_duration <=
            0.2
          ) {
            // around expected or faster
            status = "Good";
          }

          let expected_status = "good";
          if (
            (value.duration - value.expected_duration) /
              value.expected_duration >
            0.1
          ) {
            expected_status = "bad";
          } else if (
            (value.duration - value.expected_duration) /
              value.expected_duration <
            -0.1
          ) {
            expected_status = "good";
          }

          let pdiff =
            (value.duration - value.expected_duration) /
            value.expected_duration;
          // console.log(pdiff);
          let pdiff_text = "";
          if (pdiff > 0.01) {
            pdiff_text = "-" + Math.round(pdiff * 100) + "%";
          } else if (pdiff < -0.01) {
            pdiff_text = "+" + Math.round(-pdiff * 100) + "%";
          } else {
            pdiff_text = "±0";
          }

          $("#benchmarks-list").append(`
          <div class="benchmark-item">
            <div class="benchmark-iinfo">
              <p class="benchmark-name">${key}</p>
              <div class="benchmark-status ${status.toLowerCase()}">
                <p>${status}</p>
              </div>
            </div>
            <div class="benchmark-iinfo" style="margin-top: 4px">
              <p class="benchmark-speed">${value.duration} ms</p>
              <div class="benchmark-expected ${expected_status}">
                <p>${pdiff_text}</p>
              </div>
            </div>
          </div>
          <hr>
          `);
        }

        // add new error update

        $("#error-update-add").click(function () {
          openModal({
            title: "Add Error Update",
            fields: [
              {
                id: "message",
                label: "Update Message",
                type: "textarea",
                placeholder: "",
                value: "",
                validation: (value) => {
                  if (value.length < 5) {
                    return {
                      success: false,
                      message:
                        "Update message must be at least 5 characters long",
                    };
                  }
                },
              },
              {
                id: "status",
                label: "New Status",
                type: "select",
                options: [
                  { label: "Unresolved", value: "unresolved" },
                  { label: "Resolved", value: "resolved" },
                ],
                value: event.status,
              },
            ],
          }).then((data) => {
            fetch("/api/error-events/update", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                update: {
                  message: data.message,
                  status: data.status,
                  email: user.email,
                },
                ids: [event.id],
              }),
            })
              .then((resp) => resp.json())
              .then((json) => {
                if (json.success) {
                  window.location.reload();
                }
              });
          });
        });
      } else {
        // not a valid event -> redirect
        window.location.href = "/dashboard.html";
      }
    } else if (params.has("settings")) {
      // show settings
      $("#sidebar-settings").addClass("active");
      $("#dashboard-content").hide();
      $("#project-content").hide();
      $("#sproject-content").hide();
      $("#settings-content").show();
      $("#sdeployment-overview-content").hide();
      $("#sdeployment-errors-content").hide();
      $("#sdeployment-performance-content-1").hide();
      $("#sdeployment-performance-content-2").hide();
      $("#sdeployment-uptime-content").hide();
      $("#sdeployment-settings-content").hide();
      $("#serror-overview-content").hide();
      $("#smonitor-content").hide();

      $("#settings-fname").text(user.first_name);
      $("#settings-lname").text(user.last_name);
      $("#settings-email").text(user.email);
      let created_at = parseSqlTimestamp(user.created_at);
      let hours = created_at.getHours() % 12;
      let minutes = created_at.getMinutes().toString().padStart(2, "0");
      let suffix = created_at.getHours() >= 12 ? "PM" : "AM";

      $("#settings-created-on").text(`
        ${created_at.getMonth() + 1}/${created_at.getDate()}/${created_at.getFullYear()} at ${hours}:${minutes} ${suffix}`);

      $("#edit-name-button").click(function () {
        openModal({
          title: "Edit Name",
          fields: [
            {
              id: "first_name",
              label: "First Name",
              type: "text",
              placeholder: "",
              value: user.first_name,
              validate: (value) => {
                if (value.length < 1) {
                  return {
                    success: false,
                    message: "First name field is required",
                  };
                }
                return {
                  success: true,
                };
              },
            },
            {
              id: "last_name",
              label: "Last Name",
              type: "text",
              placeholder: "",
              value: user.last_name,
              validate: (value) => {
                if (value.length < 1) {
                  return {
                    success: false,
                    message: "Last name field is required",
                  };
                }
                return {
                  success: true,
                };
              },
            },
          ],
        }).then((data) => {
          fetch("/api/users/" + user.id + "/update_name", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              first_name: data.first_name,
              last_name: data.last_name,
              session_id: localStorage.getItem("session_id"),
            }),
          })
            .then((resp) => resp.json())
            .then((json) => {
              user = json.user;

              $("#settings-fname").text(user.first_name);
              $("#settings-lname").text(user.last_name);
              $("#settings-email").text(user.email);
              let created_at = parseSqlTimestamp(user.created_at);
              let hours = created_at.getHours() % 12;
              let minutes = created_at.getMinutes().toString().padStart(2, "0");
              let suffix = created_at.getHours() >= 12 ? "PM" : "AM";
              $("#settings-created-on").text(
                `${created_at.getMonth() + 1}/${created_at.getDate()}/${created_at.getFullYear()} at ${hours}:${minutes} ${suffix}`,
              );
            });
        });
      });

      $("#change-password-button").click(function () {
        openModal({
          title: "Change Password",
          fields: [
            {
              id: "current_password",
              label: "Current Password",
              type: "password",
              placeholder: "",
              validate: (value) => {
                if (value.length < 1) {
                  return {
                    success: false,
                    message: "Current password field is required",
                  };
                }
                return {
                  success: true,
                };
              },
            },
            {
              id: "new_password",
              label: "New Password",
              type: "password",
              placeholder: "",
              validate: (value) => {
                if (value.length < 8) {
                  return {
                    success: false,
                    message: "New password must be at least 8 characters long",
                  };
                }
                return {
                  success: true,
                };
              },
            },
            {
              id: "confirm_password",
              label: "Confirm New Password",
              type: "password",
              placeholder: "",
              validate: (value, password) => {
                if (value.length < 8) {
                  return {
                    success: false,
                    message:
                      "Confirm password must be at least 8 characters long",
                  };
                }
                if (value !== password) {
                  return {
                    success: false,
                    message: "Confirm password does not match new password",
                  };
                }
                return {
                  success: true,
                };
              },
            },
            {
              id: "confirmation",
              label:
                "I understand that changing my password will log me out of all active sessions.",
              type: "checkbox",
            },
          ],
        }).then((data) => {
          if (data.confirmation == true) {
            fetch("/api/users/" + user.id + "/update_password", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                current_password: data.current_password,
                new_password: data.new_password,
                session_id: localStorage.getItem("session_id"),
              }),
            })
              .then((resp) => resp.json())
              .then((json) => {
                // console.log(json);
                if (json.success) {
                  localStorage.removeItem("session_id");
                  window.location.href = "/signin.html";
                }
              });
          }
        });
      });

      $("#sign-out-button").click(function () {
        localStorage.removeItem("session_id");
        window.location.href = "/signin.html";
      });
    } else {
      // dashboard overview
      $("#sidebar-dashboardb").addClass("active");
      $("#dashboard-content").show();
      $("#project-content").hide();
      $("#sproject-content").hide();
      $("#settings-content").hide();
      $("#serror-overview-content").hide();
      $("#sdeployment-overview-content").hide();
      $("#sdeployment-errors-content").hide();
      $("#sdeployment-performance-content-1").hide();
      $("#sdeployment-performance-content-2").hide();
      $("#sdeployment-uptime-content").hide();
      $("#sdeployment-settings-content").hide();
      $("#smonitor-content").hide();

      // populate dashboard

      let active_deployment_count = 0;
      for (let i = 0; i < projects.length; i++) {
        for (let j = 0; j < projects[i].deployments.length; j++) {
          // console.log(projects[i].deployments[j]);
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
  $("#sbp-overview").click(function () {
    window.location.href = "/dashboard.html?projectOverview";
  });

  window.addEventListener("pageshow", function () {
    if (event.persisted) {
      window.location.reload();
    }
  });
});
