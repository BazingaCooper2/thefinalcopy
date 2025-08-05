# Filename - server.py

# Import flask and datetime module for showing date and time
from flask import Flask, jsonify
import datetime
import mysql.connector
from flask_cors import CORS
import json


x = datetime.datetime.now()

# Initializing flask app
app = Flask(__name__)
CORS(app)


# Route for seeing a data
mysql= mysql.connector.connect(
    host="localhost",
    user="alayacare",
    password="tiger",
    database="alayacare"
)
@app.route('/')
#@app.route('/schedule_shift')
def schedule():
    cursor = mysql.cursor(dictionary=True)
    cursor.execute("SELECT * FROM CLIENT")
    result = cursor.fetchall()
    cursor.execute("SELECT * FROM EMPLOYEE")
    result2 = cursor.fetchall()
    cursor.execute("SELECT * FROM SHIFT")
    result3 = cursor.fetchall()
    cursor.execute("SELECT * FROM DAILY_SHIFT")
    result4 = cursor.fetchall()
    datatosend={
        "client":result,
        "employee":result2,
        "shift":result3,
        "daily_shift":result4
    }
    return jsonify(datatosend)

if __name__=='__main__':
  app.run()
