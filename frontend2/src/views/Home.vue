<template>
  <div class="home" style="margin-top: 5rem;">
    <b-container></b-container>
    <b-container cols="6">
      <b-table hover :head-variant="head" :items="items" :fields="fields">
      </b-table>
      <div v-if="itemlength <= 0" class="text-center my-2">
        There are currently no rooms available!
      </div>
    </b-container>
    <b-container></b-container>
  </div>
</template>

<script>

export default {
  name: 'Home',
  data() {
    return {
      fields: [
        { key: 'id', sortable: true, label: '#' },
        { key: 'name', sortable: true, label: 'Room Name' }, 
        { key: 'pw', sortable: true, label: 'Password' },
        { key: 'users', sortable: true, label: 'Players' }
      ],
      items: [],
      itemlength: 0, 
      head: null
    }
  },
  created() {
    this.head = 'dark'
    this.getAllRooms()
  },
  methods: {
    async getAllRooms() {
      let _url = 'http://127.0.0.1:1337/room';
      //console.log(window.location.origin);
      let res_data = await this.axios.get(_url);
      res_data.data.forEach(el => {
        el.users = `${el.players.length}/${el.maxplayers}`;
        if(el.password.length > 0) el.pw = 'true';
        else el.pw = 'false';
      });
      this.items = res_data.data;
      this.itemlength = this.items.length;
    }
  }
}

</script>
