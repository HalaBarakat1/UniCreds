Use `scripts/revokeCredential.ts` after setting these `.env` values:

- `CONTRACT_ADDRESS`
- `CERT_HASH`
- `REVOCATION_REASON`

Then run:

```bash
npx hardhat run scripts/revokeCredential.ts --network localhost
```
