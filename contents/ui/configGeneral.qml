import QtQuick 2.0
import QtQuick.Controls 2.0
import QtQuick.Layouts 1.0
import org.kde.kirigami 2.20 as Kirigami

Kirigami.FormLayout {
    id: generalPage
    anchors.fill: parent
    
    property alias cfg_username: usernameField.text
    property alias cfg_password: passwordField.text
    property alias cfg_refreshInterval: refreshIntervalField.value
    property alias cfg_systemSize: systemSizeField.value
    
    TextField {
        id: usernameField
        Kirigami.FormData.label: "Email Address:"
        placeholderText: "Enter your E3/DC email"
        Layout.fillWidth: true
    }

    TextField {
        id: passwordField
        Kirigami.FormData.label: "Portal Password:"
        placeholderText: "Enter your E3/DC password"
        echoMode: TextInput.Password
        Layout.fillWidth: true
    }
}
