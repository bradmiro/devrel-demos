// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from "react";
import { useSelector, useDispatch } from "react-redux";
import ControlPanel from "./ControlPanel";
import CargoResult from "./CargoResult";
import Train from "./Train";
import Signal from "./Signal";
import Ribbon from "./Ribbon";
import { stopMission, updateInputMailbox } from "../actions/coreActions";
import { publishMessage } from "../utils/pubsub";
import "./styles/Dashboard.css";

/**
 * Dashboard
 * -----------------
 *
 */
const Dashboard = (props) => {
  const state = useSelector((state) => state);
  const dispatch = useDispatch();
  const { signals, cargo, train, proposal, trainMailbox } = props || {};
  const { patterns, services, worldState } = state.coreReducer;

  useEffect(async () => {
    // Mission selected
    if (proposal?.pattern_slug) {
      await publishMessage("begin_mission", { timestamp: Date.now() });
    }
  }, [proposal?.pattern_slug]);

  useEffect(async () => {
    // Location update
    if (train?.actual_location) {
      await publishMessage("location_update", { train, timestamp: Date.now() });
    }
  }, [train?.actual_location]);

  useEffect(async () => {
    // Updated cargo
    if (cargo?.actual_cargo.length) {
      await publishMessage("cargo_read", { cargo, timestamp: Date.now() });
    }
  }, [cargo?.actual_cargo]);

  // Stop and reset whole mission
  const handleStopMission = async (event) => {
    dispatch(stopMission());
    await updateInputMailbox("reset");
    window.location.replace("/");
  };

  return (
    <div className="dashboardContainer">
      <div className="dashboardWrapper">
        <div className="dashboardPanel">
          <div className="missionTitle">
            <h3>{`Your Mission: ${proposal?.pattern_slug?.split("_")?.join(" ")}`}</h3>
          </div>
          <CargoResult train={train} signals={signals} proposal={proposal} />
        </div>
        <div className="dashboardPanel">
          <div className="dashboardSignals">
            <div className="columns">
              <p>Loaded cargo ...</p>
              <Signal isStation={true} trainLocation={train?.actual_location} />
              <Signal
                trainLocation={train?.actual_location}
                signal={signals?.one}
              />
              <Signal
                trainLocation={train?.actual_location}
                signal={signals?.two}
              />
              <Signal
                trainLocation={train?.actual_location}
                signal={signals?.three}
              />
              <Signal
                trainLocation={train?.actual_location}
                signal={signals?.four}
              />
            </div>
          </div>
          <Train train={train} cargo={cargo} />
          <ControlPanel
            cargo={cargo}
            proposalResult={proposal?.proposal_result}
            trainMailbox={trainMailbox}
          />
        </div>
      </div>
      <div className="actionPanel">
        <button className="stop" onClick={handleStopMission}>
          Stop Mission
        </button>
      </div>
      <Ribbon />
    </div>
  );
};

export default Dashboard;
