pipeline {
    agent any
    tools {
        nodejs 'NodeJS'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }
        stage('Lint & Format Check') {
            steps {
                bat 'npm run lint'
            }
        }
        stage('Build Backend') {
            steps {
                bat 'npm run build'
            }
        }
        stage('Deploy Backend') {
            steps {
                bat 'npm start'
            }
        }
    }
    post {
        always {
            echo 'Backend Build completed.'
        }
        failure {
            echo 'Backend Pipeline failed!'
        }
    }
}
