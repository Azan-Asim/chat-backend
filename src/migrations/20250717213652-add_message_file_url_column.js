'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    
    await queryInterface.addColumn('Messages', 'message_file_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn('Messages', 'type', {
      type: Sequelize.ENUM('text', 'audio', 'video', 'image'),
      allowNull: true,
      defaultValue: 'text',
    });
  },

  down: async (queryInterface, Sequelize) => {

    await queryInterface.removeColumn('Messages', 'message_file_url');

    await queryInterface.changeColumn('Messages', 'type', {
      type: Sequelize.ENUM('dm', 'workspace'),
      allowNull: true,
      defaultValue: 'dm',
    });
  },
};
