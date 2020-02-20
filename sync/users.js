async function getUsers(ctx) {
  let body = {
    grant_type: 'client_credentials',
  };

  let buf = Buffer.from(`${skolon.client_id}:${skolon.client_secret}`);
  let encoded = buf.toString('base64');

  try {
    const auth = await OAuthApi.post('access_token', qs.stringify(body), {
      headers: {
        'Authorization': 'Basic ' + encoded,
      },
    });

    const users = await PartnerApi.get('group', { 
      headers: { 
        'Authorization': 'Bearer ' + auth.data.access_token
      }
    });

    ctx.body = {
      data: users.data,
    };

  } catch (e) { console.log(e) }
};