#!/usr/bin/python
# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
import os
import time

from google.cloud import bigtable
from mfrc522 import SimpleMFRC522
import RPi.GPIO as GPIO

from beam_break_sensor import BeamBreakSensor
from side_controller import SideController

# Pins as mapped to the Pis
PINS = [i for i in range(19, 27)]

# Subtract current_time from this value to get rows ordered last to first
MAX_VALUE = 9999999999

# Reset rowkey if the last RFID read was N seconds ago
ROWKEY_RESET = 30

# Read RFID every N seconds
RFID_WAIT = 3

# Load args
project_id = os.environ["PROJECT_ID"]
instance_id = "data-dash"
table_id = "races"
table_id_ip = "ip_addresses"

# Bigtable objects
client = bigtable.Client(project=project_id)
instance = client.instance(instance_id)
table = instance.table(table_id)
table_ip = instance.table_ip(table_id_ip)

try:
    # Initialize Pi connections to read as BCM
    GPIO.setmode(GPIO.BCM)

    # Initialize sensors
    sensors = [BeamBreakSensor(i, pin, table) \
               for i, pin in enumerate(PINS, start=1)]

    # Initialize RFID sensor
    reader = SimpleMFRC522()

    # SideController controls if this Pi should 
    side_controller = SideController(table_ip)

    # Column mappings of side_controller
    car_side_map = {
        side_controller.LEFT_CONST: "car1",
        side_controller.RIGHT_CONST: "car2",
    }

    # Initialize the "side" of the webapp this Pi streams
    side = side_controller.get_side()

    id = None
    rowkey = None
    last_scan = 0
    last_seen = 0

    print(side)
    print(f"STARTING SIDE: {car_side_map[side]}")
    while True:
        _time = time.time()

        if _time - last_seen > ROWKEY_RESET:
            rowkey = None

        # Only accept RFID reads after a certain period
        if _time - last_scan > RFID_WAIT:
            id = reader.read_id_no_block()
            last_scan = _time

            if id and not side_controller.is_side(id):
                last_seen = _time
                side = side_controller.get_side()
                rowkey = f"track{side+1}#{MAX_VALUE - _time}"
                row = table.direct_row(rowkey)
                row.set_cell("cf", "car_id", str(id))
                row.commit()

        # Poll sensors
        if rowkey:
            for sensor in sensors:
                sensor.read(rowkey)
finally:
    GPIO.cleanup()
