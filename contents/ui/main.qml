import QtQuick
import org.kde.plasma.plasmoid
import org.kde.plasma.components as PlasmaComponents
import QtQuick.Layouts
import "e3dc_api.js" as E3DC

PlasmoidItem {
    id: root
    
    Layout.minimumWidth: 320
    Layout.minimumHeight: 300
    Layout.preferredWidth: 320
    Layout.preferredHeight: 350
    
    property string statusMessage: "Ready"
    property string solarData: "No data"

    // Reusable Power Bar Component
    component PowerBar : Item {
        property string label
        property string valueText
        property int value
        property int max: Plasmoid.configuration.systemSize || 10000
        property color barColor
        property bool bidirectional: false
        
        height: 40
        width: parent.width
        
        Column {
            anchors.fill: parent
            spacing: 2
            
            Row {
                width: parent.width
                spacing: 5
                
                PlasmaComponents.Label {
                    text: label
                    font.bold: true
                    width: parent.width * 0.4
                }
                
                PlasmaComponents.Label {
                    text: valueText
                    width: parent.width * 0.6
                    horizontalAlignment: Text.AlignRight
                }
            }
            
            Rectangle {
                width: parent.width
                height: 6
                color: "#404040" // Background
                radius: 3
                
                Rectangle {
                    height: parent.height
                    radius: 3
                    // Calculate width based on value/max
                    // For bidirectional, center is 0? No, let's keep it simple: 0 is left.
                    // If bidirectional and negative, maybe change color?
                    width: Math.min(Math.abs(value) / max * parent.width, parent.width)
                    color: {
                        if (bidirectional && value < 0) return "red" // Discharge/Import
                        if (bidirectional && value > 0) return "green" // Charge/Export
                        return barColor
                    }
                }
            }
        }
    }

    Column {
        anchors.fill: parent
        anchors.margins: 10
        spacing: 8
        
        PlasmaComponents.Label {
            text: "E3DC Solar"
            font.bold: true
            font.pixelSize: 14
            horizontalAlignment: Text.AlignHCenter
            width: parent.width
            opacity: 0.8
        }
        
        PowerBar {
            label: "Solar"
            valueText: solarValue + " W"
            value: parseInt(solarValue) || 0
            barColor: "#f1c40f" // Yellow
        }
        
        PowerBar {
            label: "Battery " + batterySoc
            valueText: batteryValue + " W"
            value: parseInt(batteryValue) || 0
            barColor: "#2ecc71" // Green
            bidirectional: true // Green=Charge, Red=Discharge
        }
        
        PowerBar {
            label: "Home"
            valueText: homeValue + " W"
            value: parseInt(homeValue) || 0
            barColor: "#3498db" // Blue
        }
        
        PowerBar {
            label: "Grid"
            valueText: gridValue + " W"
            value: parseInt(gridValue) || 0
            barColor: "#e74c3c" // Red
            bidirectional: true // Green=Export, Red=Import
        }
        
        PowerBar {
            label: "Wallbox"
            valueText: wallboxValue + " W"
            value: parseInt(wallboxValue) || 0
            barColor: "#e67e22" // Orange
        }

        Item { height: 5; width: 1 } // Spacer

        PlasmaComponents.Label {
            text: root.statusMessage
            font.pixelSize: 9
            opacity: 0.6
            horizontalAlignment: Text.AlignHCenter
            width: parent.width
            wrapMode: Text.WordWrap
        }
        
        Row {
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 10
            
            PlasmaComponents.Button {
                text: "Refresh"
                font.pixelSize: 10
                onClicked: refreshData()
            }
        }
    }
    
    // Hidden properties to hold raw values for bindings
    property string solarValue: "0"
    property string batteryValue: "0"
    property string batterySoc: ""
    property string homeValue: "0"
    property string gridValue: "0"
    property string wallboxValue: "0"

    function refreshData() {
        var user = Plasmoid.configuration.username
        var pass = Plasmoid.configuration.password
        
        if (!user || !pass) {
            statusMessage = "Please configure username and password"
            return
        }

        statusMessage = "Refreshing..."
        var passwordHash = Qt.md5(pass)
        
        try {
            E3DC.authenticate(user, passwordHash, function(success, message, debugInfo) {
                if (success) {
                    E3DC.fetchSystemStatus(function(dataSuccess, dataResponse) {
                        if (dataSuccess) {
                            statusMessage = "Last update: " + new Date().toLocaleTimeString()
                            
                            // Update Properties
                            solarValue = dataResponse.solar
                            batteryValue = dataResponse.battery
                            batterySoc = "(" + dataResponse.soc + "%)"
                            homeValue = dataResponse.home
                            gridValue = dataResponse.grid
                            wallboxValue = dataResponse.wallbox
                        } else {
                            statusMessage = "Error: " + String(dataResponse)
                        }
                    })
                } else {
                    statusMessage = "Auth failed: " + message
                }
            })
        } catch (e) {
            statusMessage = "Error: " + e.toString()
        }
    }
    
    Timer {
        id: refreshTimer
        interval: (Plasmoid.configuration.refreshInterval || 60) * 1000
        running: true
        repeat: true
        onTriggered: refreshData()
    }
    
    Connections {
        target: Plasmoid.configuration
        function onRefreshIntervalChanged() {
            refreshTimer.interval = (Plasmoid.configuration.refreshInterval || 60) * 1000
            refreshTimer.restart()
        }
    }
    
    Component.onCompleted: {
        if (Plasmoid.configuration.username) {
            refreshData()
        }
    }
}
