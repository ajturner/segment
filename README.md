## Versioning for ArcGIS

Technology demonstration for using ArcGIS versioned databases.

Major WIP

```
Title: ArcGIS Collaboration
Source->Fork: Clone Service
Fork->Fork: Updates
Fork-->Subscriber: Webhook
Fork-->>Source: Compare
Fork->Source: Apply Edits
Source-->>Subscriber: Webhook
```

![diagram](diagram.svg)


## Develop

```bash
node run compile
node test.js
```

```
npm link
```

in app:

```
npm link segment
gulp watch
```

http://localhost:8000
