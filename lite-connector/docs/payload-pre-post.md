# LiteConnector Example Usage via a Single Endpoint in One Step

### Start the connectors

```
node ./launch-connectors.js --type 1
```

or

```
./launch-connectors.sh --type 1
```

### **Endpoint to create the chain across all connectors**

**POST**: `http://localhost:8887/chain/create-and-start`

**Payload Example parallel, with meta data, resolver and configuration*:

```json
{
  "chainConfig": [
    {
      "services": ["http://localhost:8887/service1"],
      "location": "local",
      "monitoringHost": "http://localhost:8887/"
    },
    {
      "services": ["http://localhost:8888/service1"],
      "location": "remote",
      "monitoringHost": "http://localhost:8887/",
      "pre": [
        [
          {
            "services": [{"targetId": "http://localhost:8890/service1"}],
            "location": "remote",
            "childMode": "pre",
            "monitoringHost": "http://localhost:8887/"
          },
          {
            "services": [{"targetId": "http://localhost:8887/service1"}],
            "location": "remote",
            "monitoringHost": "http://localhost:8887/"
          }
        ],
        [
          {
            "services": [{"targetId": "http://localhost:8890/service2"}],
            "location": "remote",
            "childMode": "pre",
            "monitoringHost": "http://localhost:8887/"
          },
          {
            "services": [{"targetId": "http://localhost:8887/service1"}],
            "location": "remote",
            "monitoringHost": "http://localhost:8887/"
          }
        ]
      ]
    },
    {
      "services": ["http://localhost:8889/service2"],
      "location": "remote",
      "monitoringHost": "http://localhost:8887/"
    }
  ],
  "data": {
    "hello": "here the input data"
  }
}
```